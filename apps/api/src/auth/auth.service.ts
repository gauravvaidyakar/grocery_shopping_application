import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService, type JwtSignOptions } from "@nestjs/jwt";
import {
  NotificationStatus,
  Prisma,
  Role,
  UserStatus,
  VerificationOtpPurpose,
  type User,
} from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import type {
  ForgotPasswordDto,
  ChangeVendorPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from "./auth.dto";
import { CustomerOtpProvider } from "./customer-otp-provider";

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface OtpChallengePayload {
  sub: string;
  type: "customer_account_verification" | "customer_password_reset";
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly customerOtp?: CustomerOtpProvider,
  ) {}

  async register(input: RegisterDto): Promise<Record<string, unknown>> {
    if (input.role === Role.ADMIN)
      throw new BadRequestException(
        "Administrator accounts cannot be self-registered",
      );
    if (!input.email && !input.mobile)
      throw new BadRequestException("Email or mobile is required");
    const pickupPincode = input.businessAddress?.pincode?.trim();
    if (input.role === Role.VENDOR && !/^\d{6}$/.test(pickupPincode ?? ""))
      throw new BadRequestException(
        "A valid 6-digit vendor pickup pincode is required",
      );
    const exists = await this.prisma.user.findFirst({
      where: {
        OR: [
          input.email ? { email: input.email.toLowerCase() } : {},
          input.mobile ? { mobile: input.mobile } : {},
        ],
      },
    });
    if (exists)
      throw new ConflictException(
        "An account already exists for this email or mobile",
      );
    const passwordHash = await hash(input.password, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email?.toLowerCase(),
          mobile: input.mobile,
          passwordHash,
          role: input.role,
        },
      });
      if (input.role === Role.CUSTOMER) {
        const names = input.name?.trim().split(/\s+/);
        await tx.customerProfile.create({
          data: {
            userId: created.id,
            firstName: input.firstName ?? names?.[0] ?? "",
            lastName: input.lastName ?? names?.slice(1).join(" ") ?? "",
            cart: { create: {} },
          },
        });
      } else {
        await tx.vendor.create({
          data: {
            userId: created.id,
            businessName: input.businessName!,
            ownerName: input.ownerName!,
            businessAddress: input.businessAddress as Prisma.InputJsonValue,
            pickupPincode,
            statusHistory: {
              create: {
                toStatus: "REGISTERED",
                actorId: created.id,
                reason: "Vendor registered",
              },
            },
          },
        });
      }
      return created;
    });
    if (user.role !== Role.CUSTOMER) return this.createSession(user);
    return this.createCustomerOtpChallenge(
      user,
      VerificationOtpPurpose.ACCOUNT_VERIFICATION,
    );
  }

  async login(input: LoginDto): Promise<Record<string, unknown>> {
    const identifier = input.emailOrMobile.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { mobile: identifier }],
      },
    });
    if (!user || !(await compare(input.password, user.passwordHash)))
      throw new UnauthorizedException("Invalid credentials");
    if (user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException("Account is not active");
    if (user.role === Role.CUSTOMER && !user.mobileVerifiedAt) {
      return this.createCustomerOtpChallenge(
        user,
        VerificationOtpPurpose.ACCOUNT_VERIFICATION,
      );
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.createSession(user);
  }

  async refresh(input: RefreshDto): Promise<Record<string, unknown>> {
    let payload: { sub: string; type: string };
    try {
      payload = await this.jwt.verifyAsync(input.refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (payload.type !== "refresh")
      throw new UnauthorizedException("Invalid refresh token");
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (
      !user?.refreshTokenHash ||
      !(await compare(input.refreshToken, user.refreshTokenHash))
    )
      throw new UnauthorizedException("Refresh token has been revoked");
    return this.createSession(user);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }

  async forgotPassword(
    input: ForgotPasswordDto,
  ): Promise<Record<string, unknown>> {
    const identifier = input.emailOrMobile.trim();
    const genericResponse: Record<string, unknown> = {
      message: "If the account exists, reset instructions will be sent securely.",
    };
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { mobile: identifier }],
      },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      return {
        ...genericResponse,
        challengeToken: await this.signOtpChallenge(
          randomUUID(),
          "customer_password_reset",
        ),
        maskedDestination: this.maskIdentifier(identifier),
        resendAfterSeconds: this.otpCooldownSeconds(),
      };
    }

    if (user.role === Role.CUSTOMER) {
      try {
        const challenge = await this.createCustomerOtpChallenge(
          user,
          VerificationOtpPurpose.PASSWORD_RESET,
        );
        return { ...genericResponse, ...challenge };
      } catch {
        // Keep the public response indistinguishable to prevent account enumeration.
        return {
          ...genericResponse,
          challengeToken: await this.signOtpChallenge(
            user.id,
            "customer_password_reset",
          ),
          maskedDestination: this.maskIdentifier(identifier),
          resendAfterSeconds: this.otpCooldownSeconds(),
        };
      }
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const ttlMinutes = Math.max(
      5,
      Number(this.config.get<string>("PASSWORD_RESET_TTL_MINUTES", "30")),
    );
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      }),
    ]);

    const resetBaseUrl =
      user.role === Role.VENDOR
        ? this.config.get<string>("VENDOR_WEB_URL", "http://localhost:5174")
        : this.config.get<string>("CUSTOMER_WEB_URL", "http://localhost:5173");
    const resetUrl = `${resetBaseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
    await this.notifications?.sendWhatsApp(user.id, "password_reset", {
      resetUrl,
      expiresInMinutes: ttlMinutes,
    });

    if (this.config.get<string>("NODE_ENV", "development") !== "production") {
      genericResponse.developmentResetUrl = resetUrl;
    }
    return genericResponse;
  }

  async resetPassword(input: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException("Reset link is invalid or has expired");
    }
    const passwordHash = await hash(input.password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, refreshTokenHash: null },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { userId: resetToken.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);
    return { message: "Password updated successfully" };
  }

  async requestVerificationOtp(
    userId: string,
  ): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { vendor: { select: { businessMobile: true } } },
    });
    if (!user) throw new UnauthorizedException("Account not found");
    if (user.mobileVerifiedAt) {
      return { message: "Mobile number is already verified", verified: true };
    }
    if (!user.mobile && !user.vendor?.businessMobile) {
      throw new BadRequestException(
        "Add a mobile number before requesting verification",
      );
    }

    const result = await this.issueOtp(
      { ...user, mobile: user.mobile ?? user.vendor?.businessMobile ?? null },
      VerificationOtpPurpose.ACCOUNT_VERIFICATION,
    );
    return { message: "Verification code sent securely", ...result };
  }

  async verifyOtp(
    userId: string,
    input: VerifyOtpDto,
  ): Promise<{ message: string; verified: true }> {
    const challenge = await this.validateOtp(
      userId,
      VerificationOtpPurpose.ACCOUNT_VERIFICATION,
      input.code,
    );
    const verifiedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.verificationOtp.updateMany({
        where: { id: challenge.id, consumedAt: null },
        data: { consumedAt: verifiedAt },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException("Verification code is invalid or expired");
      }
      await tx.user.update({
        where: { id: userId },
        data: { mobileVerifiedAt: verifiedAt },
      });
    });
    return { message: "Mobile number verified successfully", verified: true };
  }

  async resendCustomerOtp(challengeToken: string) {
    const payload = await this.verifyOtpChallenge(challengeToken);
    const purpose = payload.type === "customer_password_reset"
      ? VerificationOtpPurpose.PASSWORD_RESET
      : VerificationOtpPurpose.ACCOUNT_VERIFICATION;
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.role !== Role.CUSTOMER || user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException("Verification request is invalid or expired");
    }
    if (purpose === VerificationOtpPurpose.ACCOUNT_VERIFICATION && user.mobileVerifiedAt) {
      throw new BadRequestException("Account is already verified. Please sign in.");
    }
    const otp = await this.customerOtpConfiguration(user);
    return {
      message: "MSG91 is ready to resend the verification code securely",
      challengeToken: await this.signOtpChallenge(payload.sub, payload.type),
      maskedDestination: this.maskMobile(user.mobile),
      expiresInMinutes: 5,
      resendAfterSeconds: this.otpCooldownSeconds(),
      otp,
    };
  }

  async verifyCustomerAccountOtp(challengeToken: string, accessToken: string) {
    const payload = await this.verifyOtpChallenge(challengeToken, "customer_account_verification");
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.role !== Role.CUSTOMER || user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException("Verification code is invalid or expired");
    }
    await this.verifyCustomerOtpAccessToken(user, accessToken);
    const verifiedAt = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { mobileVerifiedAt: verifiedAt, lastLoginAt: verifiedAt },
    });
    return this.createSession({ ...user, mobileVerifiedAt: verifiedAt });
  }

  async verifyPasswordResetOtp(challengeToken: string, accessToken: string) {
    const payload = await this.verifyOtpChallenge(challengeToken, "customer_password_reset");
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.role !== Role.CUSTOMER || user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException("Verification code is invalid or expired");
    }
    await this.verifyCustomerOtpAccessToken(user, accessToken);
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
    });
    return { message: "Verification successful", resetToken: token };
  }

  async changeVendorPassword(
    userId: string,
    input: ChangeVendorPasswordDto,
  ): Promise<{ message: string; requiresReauthentication: true }> {
    if (input.newPassword !== input.confirmNewPassword) {
      throw new BadRequestException("New password confirmation does not match");
    }
    if (input.currentPassword === input.newPassword) {
      throw new BadRequestException(
        "New password must be different from the current password",
      );
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== Role.VENDOR) {
      throw new ForbiddenException("Vendor account access is required");
    }
    if (!(await compare(input.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    const passwordHash = await hash(input.newPassword, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, refreshTokenHash: null },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);
    return {
      message: "Password changed successfully. Please sign in again.",
      requiresReauthentication: true,
    };
  }

  private async createCustomerOtpChallenge(
    user: User,
    purpose: VerificationOtpPurpose,
  ): Promise<Record<string, unknown>> {
    const otp = await this.customerOtpConfiguration(user);
    const type: OtpChallengePayload["type"] =
      purpose === VerificationOtpPurpose.PASSWORD_RESET
        ? "customer_password_reset"
        : "customer_account_verification";
    return {
      verificationRequired: true,
      challengeToken: await this.signOtpChallenge(user.id, type),
      maskedDestination: this.maskMobile(user.mobile),
      message: "MSG91 is ready to send the verification code securely",
      expiresInMinutes: 5,
      resendAfterSeconds: this.otpCooldownSeconds(),
      otp,
    };
  }

  private async customerOtpConfiguration(user: User) {
    if (!user.mobile) {
      throw new ServiceUnavailableException("OTP delivery requires a registered mobile number");
    }
    if (!this.customerOtp) {
      throw new ServiceUnavailableException("Customer OTP provider is unavailable");
    }
    return this.customerOtp.getClientConfiguration(user.mobile);
  }

  private async verifyCustomerOtpAccessToken(user: User, accessToken: string) {
    if (!user.mobile || !this.customerOtp) {
      throw new ServiceUnavailableException("Customer OTP provider is unavailable");
    }
    await this.customerOtp.verifyAccessToken(accessToken, user.mobile);
  }

  private async issueOtp(user: User, purpose: VerificationOtpPurpose) {
    if (!user.mobile) {
      throw new ServiceUnavailableException(
        "OTP delivery requires a registered mobile number",
      );
    }
    const cooldownSeconds = this.otpCooldownSeconds();
    const latest = await this.prisma.verificationOtp.findFirst({
      where: { userId: user.id, purpose, consumedAt: null },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (latest) {
      const remaining = cooldownSeconds - Math.floor((Date.now() - latest.createdAt.getTime()) / 1000);
      if (remaining > 0) {
        throw new HttpException(
          `Please wait ${remaining} seconds before requesting another code`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const code = randomInt(100_000, 1_000_000).toString();
    const codeHash = await hash(code, 12);
    const ttlMinutes = Math.max(5, Number(this.config.get<string>("OTP_TTL_MINUTES", "5")));
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    await this.prisma.$transaction([
      this.prisma.verificationOtp.deleteMany({
        where: { userId: user.id, purpose, consumedAt: null },
      }),
      this.prisma.verificationOtp.create({
        data: { userId: user.id, purpose, codeHash, expiresAt },
      }),
    ]);
    const template = purpose === VerificationOtpPurpose.PASSWORD_RESET
      ? "password_reset_otp"
      : "customer_registration_otp";
    const delivery = await this.notifications?.sendSms(
      user.id,
      template,
      { expiresInMinutes: ttlMinutes },
      { otp: code, expiresInMinutes: ttlMinutes },
    );
    if (!delivery || delivery.status !== NotificationStatus.SENT) {
      await this.prisma.verificationOtp.deleteMany({
        where: { userId: user.id, purpose, consumedAt: null },
      });
      throw new ServiceUnavailableException(
        "Verification code could not be delivered. Please try again later.",
      );
    }
    return {
      expiresInMinutes: ttlMinutes,
      resendAfterSeconds: cooldownSeconds,
    };
  }

  private async validateOtp(
    userId: string,
    purpose: VerificationOtpPurpose,
    code: string,
  ) {
    const challenge = await this.prisma.verificationOtp.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!challenge || challenge.expiresAt.getTime() <= Date.now() || challenge.attempts >= 5) {
      throw new BadRequestException("Verification code is invalid or expired");
    }
    if (!(await compare(code, challenge.codeHash))) {
      await this.prisma.verificationOtp.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException("Verification code is invalid or expired");
    }
    return challenge;
  }

  private async signOtpChallenge(userId: string, type: OtpChallengePayload["type"]) {
    return this.jwt.signAsync(
      { sub: userId, type },
      {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: "15m",
      },
    );
  }

  private async verifyOtpChallenge(
    token: string,
    expectedType?: OtpChallengePayload["type"],
  ): Promise<OtpChallengePayload> {
    try {
      const payload = await this.jwt.verifyAsync<OtpChallengePayload>(token, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });
      if (
        !["customer_account_verification", "customer_password_reset"].includes(payload.type) ||
        (expectedType && payload.type !== expectedType)
      ) {
        throw new Error("wrong challenge type");
      }
      return payload;
    } catch {
      throw new BadRequestException("Verification request is invalid or expired");
    }
  }

  private otpCooldownSeconds() {
    return Math.max(30, Number(this.config.get<string>("OTP_RESEND_COOLDOWN_SECONDS", "30")));
  }

  private maskMobile(mobile?: string | null) {
    if (!mobile) return "your registered contact";
    return `******${mobile.replace(/\D/g, "").slice(-4)}`;
  }

  private maskIdentifier(identifier: string) {
    if (identifier.includes("@")) {
      const [name, domain] = identifier.split("@");
      return `${name.slice(0, 2)}***@${domain ?? ""}`;
    }
    return this.maskMobile(identifier);
  }

  private async createSession(user: User): Promise<Record<string, unknown>> {
    const tokens = await this.issueTokens(user);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await hash(tokens.refreshToken, 12) },
    });
    if (user.role === Role.CUSTOMER) {
      const profile = await this.prisma.customerProfile.findUniqueOrThrow({
        where: { userId: user.id },
      });
      return {
        customer: {
          id: profile.id,
          name: `${profile.firstName} ${profile.lastName}`.trim(),
          email: user.email,
          mobile: user.mobile,
          mobileVerified: Boolean(user.mobileVerifiedAt),
          role: Role.CUSTOMER,
        },
        ...tokens,
      };
    }
    return {
      user: {
        id: user.id,
        email: user.email,
        mobile: user.mobile,
        mobileVerified: Boolean(user.mobileVerifiedAt),
        role: user.role,
      },
      ...tokens,
    };
  }

  private async issueTokens(user: User): Promise<Tokens> {
    const accessOptions: JwtSignOptions = {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get<string>(
        "JWT_ACCESS_TTL",
        "15m",
      ) as JwtSignOptions["expiresIn"],
    };
    const refreshOptions: JwtSignOptions = {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get<string>(
        "JWT_REFRESH_TTL",
        "30d",
      ) as JwtSignOptions["expiresIn"],
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: user.id, role: user.role, type: "access" },
        accessOptions,
      ),
      this.jwt.signAsync({ sub: user.id, type: "refresh" }, refreshOptions),
    ]);
    return { accessToken, refreshToken };
  }
}
