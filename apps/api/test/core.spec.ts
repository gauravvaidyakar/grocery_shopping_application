import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { JwtService } from "@nestjs/jwt";
import {
  InspectionStatus,
  NotificationStatus,
  ProductStatus,
  Role,
  UserStatus,
  VerificationOtpPurpose,
  VendorStatus,
  VendorSuspensionReason,
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { compare, hash } from "bcryptjs";
import { AdminService } from "../src/admin/admin.service";
import { AuthService } from "../src/auth/auth.service";
import type { CustomerOtpProvider } from "../src/auth/customer-otp-provider";
import { validateEnvironment } from "../src/config/environment";
import type { PrismaService } from "../src/database/prisma.service";
import type { VendorsService } from "../src/vendors/vendors.service";
import { OrdersService } from "../src/orders/orders.service";
import type { NotificationsService } from "../src/notifications/notifications.service";
import { VendorInspectionsService } from "../src/vendor-inspections/vendor-inspections.service";

describe("platform security rules", () => {
  it("rejects administrator self-registration before database access", async () => {
    const service = new AuthService(
      {} as PrismaService,
      {} as JwtService,
      {} as ConfigService,
    );
    await expect(
      service.register({
        role: Role.ADMIN,
        email: "admin@example.com",
        password: "not-used-password",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("requires a six-digit pickup pincode for vendor registration", async () => {
    const service = new AuthService(
      {} as PrismaService,
      {} as JwtService,
      {} as ConfigService,
    );
    await expect(
      service.register({
        role: Role.VENDOR,
        email: "vendor@example.com",
        password: "not-used-password",
        businessName: "Vendor",
        ownerName: "Owner",
        businessAddress: {
          line1: "Market road",
          city: "Buldhana",
          state: "Maharashtra",
        },
      }),
    ).rejects.toThrow("valid 6-digit vendor pickup pincode");
  });

  it("does not reveal whether a password-reset account exists", async () => {
    const prisma = {
      user: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      { signAsync: vi.fn().mockResolvedValue("opaque-challenge") } as unknown as JwtService,
      {
        get: vi.fn((_key: string, fallback?: unknown) => fallback),
        getOrThrow: vi.fn().mockReturnValue("a-secure-test-secret-that-is-long-enough"),
      } as unknown as ConfigService,
    );
    await expect(
      service.forgotPassword({ emailOrMobile: "missing@example.com" }),
    ).resolves.toEqual(expect.objectContaining({
      message:
        "If the account exists, reset instructions will be sent securely.",
      challengeToken: "opaque-challenge",
    }));
  });

  it("rejects an expired password-reset token", async () => {
    const prisma = {
      passwordResetToken: {
        findUnique: vi.fn().mockResolvedValue({
          userId: "user-id",
          usedAt: null,
          expiresAt: new Date(Date.now() - 1_000),
        }),
      },
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      {} as JwtService,
      {} as ConfigService,
    );
    await expect(
      service.resetPassword({ token: "expired", password: "StrongPass1" }),
    ).rejects.toThrow("invalid or has expired");
  });

  it("changes a vendor password securely and revokes refresh/reset sessions", async () => {
    const update = vi.fn().mockResolvedValue({ id: "vendor-user" });
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "vendor-user",
          role: Role.VENDOR,
          passwordHash: await hash("CurrentPass1", 12),
        }),
        update,
      },
      passwordResetToken: { updateMany },
      $transaction: vi.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      {} as JwtService,
      {} as ConfigService,
    );

    await expect(
      service.changeVendorPassword("vendor-user", {
        currentPassword: "CurrentPass1",
        newPassword: "NewVendorPass2",
        confirmNewPassword: "NewVendorPass2",
      }),
    ).resolves.toEqual({
      message: "Password changed successfully. Please sign in again.",
      requiresReauthentication: true,
    });

    const [updateInput] = update.mock.calls[0] as unknown as [
      { data: { passwordHash: string; refreshTokenHash: null } },
    ];
    expect(await compare("NewVendorPass2", updateInput.data.passwordHash)).toBe(
      true,
    );
    expect(updateInput.data.refreshTokenHash).toBeNull();
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "vendor-user", usedAt: null } }),
    );
  });

  it("rejects a vendor password change when the current password is wrong", async () => {
    const update = vi.fn();
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "vendor-user",
          role: Role.VENDOR,
          passwordHash: await hash("CurrentPass1", 12),
        }),
        update,
      },
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      {} as JwtService,
      {} as ConfigService,
    );

    await expect(
      service.changeVendorPassword("vendor-user", {
        currentPassword: "WrongPass1",
        newPassword: "NewVendorPass2",
        confirmNewPassword: "NewVendorPass2",
      }),
    ).rejects.toThrow("Current password is incorrect");
    expect(update).not.toHaveBeenCalled();
  });

  it("does not allow a non-vendor to use vendor password management", async () => {
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "customer-user",
          role: Role.CUSTOMER,
          passwordHash: "unused",
        }),
      },
    } as unknown as PrismaService;
    const service = new AuthService(
      prisma,
      {} as JwtService,
      {} as ConfigService,
    );

    await expect(
      service.changeVendorPassword("customer-user", {
        currentPassword: "CurrentPass1",
        newPassword: "NewVendorPass2",
        confirmNewPassword: "NewVendorPass2",
      }),
    ).rejects.toThrow("Vendor account access is required");
  });

  it("verifies a one-time code and consumes it while marking the mobile verified", async () => {
    const consumed = vi.fn().mockResolvedValue({ count: 1 });
    const verifyUser = vi.fn().mockResolvedValue({});
    const transactionClient = {
      verificationOtp: { updateMany: consumed },
      user: { update: verifyUser },
    };
    const prisma = {
      verificationOtp: {
        findFirst: vi.fn().mockResolvedValue({
          id: "otp-id",
          codeHash: await hash("123456", 12),
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 0,
        }),
      },
      $transaction: vi.fn(
        (operation: (tx: typeof transactionClient) => Promise<unknown>) =>
          operation(transactionClient),
      ),
    } as unknown as PrismaService;
    const service = new AuthService(prisma, {} as JwtService, {} as ConfigService);

    await expect(service.verifyOtp("user-id", { code: "123456" })).resolves.toEqual({
      message: "Mobile number verified successfully",
      verified: true,
    });
    expect(consumed).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "otp-id", consumedAt: null },
      }),
    );
    expect(verifyUser).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user-id" } }));
  });

  it("rejects a verification code that another request already consumed", async () => {
    const verifyUser = vi.fn();
    const transactionClient = {
      verificationOtp: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      user: { update: verifyUser },
    };
    const prisma = {
      verificationOtp: {
        findFirst: vi.fn().mockResolvedValue({
          id: "otp-id",
          codeHash: await hash("123456", 12),
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 0,
        }),
      },
      $transaction: vi.fn(
        (operation: (tx: typeof transactionClient) => Promise<unknown>) =>
          operation(transactionClient),
      ),
    } as unknown as PrismaService;
    const service = new AuthService(prisma, {} as JwtService, {} as ConfigService);

    await expect(service.verifyOtp("user-id", { code: "123456" })).rejects.toThrow(
      "invalid or expired",
    );
    expect(verifyUser).not.toHaveBeenCalled();
  });

  it("creates the existing customer session only after the public OTP challenge is verified", async () => {
    const user = {
      id: "customer-user",
      email: "customer@example.com",
      mobile: "9876543210",
      mobileVerifiedAt: null,
      passwordHash: await hash("StrongPass1", 12),
      refreshTokenHash: null,
      role: Role.CUSTOMER,
      status: UserStatus.ACTIVE,
    };
    const updateUser = vi.fn().mockResolvedValue(user);
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue(user),
        update: updateUser,
      },
      customerProfile: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "customer-profile",
          firstName: "Customer",
          lastName: "One",
        }),
      },
      verificationOtp: {
        findFirst: vi.fn().mockResolvedValue({
          id: "otp-id",
          codeHash: await hash("123456", 12),
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 0,
        }),
      },
    } as unknown as PrismaService;
    const jwt = {
      verifyAsync: vi.fn().mockResolvedValue({
        sub: user.id,
        type: "customer_account_verification",
      }),
      signAsync: vi.fn()
        .mockResolvedValueOnce("access-token")
        .mockResolvedValueOnce("refresh-token"),
    } as unknown as JwtService;
    const config = {
      get: vi.fn((_key: string, fallback?: unknown) => fallback),
      getOrThrow: vi.fn().mockReturnValue("a-secure-test-secret-that-is-long-enough"),
    } as unknown as ConfigService;
    const verifyAccessToken = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new BadRequestException("Verification code is invalid or expired"));
    const service = new AuthService(
      prisma,
      jwt,
      config,
      undefined,
      { verifyAccessToken } as unknown as CustomerOtpProvider,
    );

    await expect(service.verifyCustomerAccountOtp("challenge", "123456"))
      .resolves.toMatchObject({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        customer: { id: "customer-profile", mobileVerified: true },
      });
    await expect(service.verifyCustomerAccountOtp("challenge", "123456"))
      .rejects.toThrow("invalid or expired");
    expect(verifyAccessToken).toHaveBeenCalledWith("123456", "9876543210");
  });

  it("counts an invalid one-time-code attempt without exposing the expected code", async () => {
    const update = vi.fn().mockResolvedValue({});
    const prisma = {
      verificationOtp: {
        findFirst: vi.fn().mockResolvedValue({
          id: "otp-id",
          codeHash: await hash("123456", 12),
          expiresAt: new Date(Date.now() + 60_000),
          attempts: 0,
        }),
        update,
      },
    } as unknown as PrismaService;
    const service = new AuthService(prisma, {} as JwtService, {} as ConfigService);

    await expect(service.verifyOtp("user-id", { code: "654321" })).rejects.toThrow("invalid or expired");
    expect(update).toHaveBeenCalledWith({ where: { id: "otp-id" }, data: { attempts: { increment: 1 } } });
  });

  it("stores only a hash and sends the generated verification code through SMS", async () => {
    const create = vi.fn().mockResolvedValue({});
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const sendSms = vi.fn().mockResolvedValue({
      status: NotificationStatus.SENT,
    });
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-id",
          mobile: "9876543210",
          mobileVerifiedAt: null,
          vendor: null,
        }),
      },
      verificationOtp: { create, deleteMany, findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    } as unknown as PrismaService;
    const config = {
      get: vi.fn((key: string, fallback: string) =>
        key === "NODE_ENV" ? "development" : fallback,
      ),
    } as unknown as ConfigService;
    const notifications = { sendSms } as unknown as NotificationsService;
    const service = new AuthService(
      prisma,
      {} as JwtService,
      config,
      notifications,
    );

    const result = await service.requestVerificationOtp("user-id");
    const smsDelivery = sendSms.mock.calls[0]?.[3] as
      | { otp: string; expiresInMinutes: number }
      | undefined;
    const deliveredOtp = smsDelivery?.otp ?? "";
    const createInput = create.mock.calls[0]?.[0] as
      | { data: { codeHash: string } }
      | undefined;
    const storedHash = createInput?.data.codeHash ?? "";

    expect(sendSms).toHaveBeenCalledWith(
      "user-id",
      "customer_registration_otp",
      { expiresInMinutes: 5 },
      smsDelivery,
    );
    expect(deliveredOtp).toMatch(/^\d{6}$/);
    expect(storedHash).not.toBe(deliveredOtp);
    await expect(compare(deliveredOtp, storedHash)).resolves.toBe(true);
    expect(result).toMatchObject({ message: "Verification code sent securely" });
    expect(result).not.toHaveProperty("developmentOtp");
  });

  it("removes the challenge and reports failure when OTP delivery fails", async () => {
    const deleteMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-id",
          mobile: "9876543210",
          mobileVerifiedAt: null,
          vendor: null,
        }),
      },
      verificationOtp: {
        create: vi.fn().mockResolvedValue({}),
        deleteMany,
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    } as unknown as PrismaService;
    const config = {
      get: vi.fn((_key: string, fallback: string) => fallback),
    } as unknown as ConfigService;
    const notifications = {
      sendSms: vi.fn().mockResolvedValue(null),
    } as unknown as NotificationsService;
    const service = new AuthService(
      prisma,
      {} as JwtService,
      config,
      notifications,
    );

    await expect(service.requestVerificationOtp("user-id")).rejects.toThrow(
      "could not be delivered",
    );
    expect(deleteMany).toHaveBeenLastCalledWith({
      where: {
        userId: "user-id",
        purpose: VerificationOtpPurpose.ACCOUNT_VERIFICATION,
        consumedAt: null,
      },
    });
  });

  it("uses the MSG91 widget rather than WhatsApp for a customer password-reset OTP", async () => {
    const sendSms = vi.fn();
    const sendWhatsApp = vi.fn();
    const prisma = {
      user: {
        findFirst: vi.fn().mockResolvedValue({
          id: "customer-user",
          email: "customer@example.com",
          mobile: "9876543210",
          role: Role.CUSTOMER,
          status: UserStatus.ACTIVE,
        }),
      },
    } as unknown as PrismaService;
    const jwt = {
      signAsync: vi.fn().mockResolvedValue("password-reset-challenge"),
    } as unknown as JwtService;
    const config = {
      get: vi.fn((_key: string, fallback?: unknown) => fallback),
      getOrThrow: vi.fn().mockReturnValue("a-secure-test-secret-that-is-long-enough"),
    } as unknown as ConfigService;
    const notifications = { sendSms, sendWhatsApp } as unknown as NotificationsService;
    const getClientConfiguration = vi.fn().mockResolvedValue({
      provider: "MSG91_WIDGET",
      widgetId: "widget-id",
      tokenAuth: "browser-token",
      identifier: "919876543210",
    });
    const service = new AuthService(
      prisma,
      jwt,
      config,
      notifications,
      { getClientConfiguration } as unknown as CustomerOtpProvider,
    );

    await expect(service.forgotPassword({ emailOrMobile: "customer@example.com" }))
      .resolves.toMatchObject({
        challengeToken: "password-reset-challenge",
        otp: { provider: "MSG91_WIDGET", identifier: "919876543210" },
      });
    expect(getClientConfiguration).toHaveBeenCalledWith("9876543210");
    expect(sendSms).not.toHaveBeenCalled();
    expect(sendWhatsApp).not.toHaveBeenCalled();
  });

  it("requires independent strong JWT secrets and field encryption", () => {
    expect(() =>
      validateEnvironment({
        DATABASE_URL: "postgresql://db",
        JWT_ACCESS_SECRET: "short",
        JWT_REFRESH_SECRET: "short",
        BANK_DATA_ENCRYPTION_KEY: "bad",
        CORS_ORIGINS: "http://localhost:5173",
      }),
    ).toThrow();
  });

  it("rejects wildcard CORS in production", () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://db",
        JWT_ACCESS_SECRET: "a".repeat(32),
        JWT_REFRESH_SECRET: "b".repeat(32),
        BANK_DATA_ENCRYPTION_KEY: "c".repeat(64),
        CORS_ORIGINS: "*",
      }),
    ).toThrow("Wildcard CORS");
  });
});

describe("approval gates", () => {
  it("does not approve a product owned by an unapproved vendor", async () => {
    const prisma = {
      product: {
        findUnique: vi.fn().mockResolvedValue({
          id: "product",
          status: ProductStatus.PENDING_APPROVAL,
          vendor: { status: VendorStatus.PENDING },
        }),
      },
    } as unknown as PrismaService;
    const service = new AdminService(prisma, {} as VendorsService);
    await expect(service.approveProduct("product", "admin")).rejects.toThrow(
      "Vendor must be approved",
    );
  });

  it("does not reject an already approved vendor", async () => {
    const prisma = {
      vendor: {
        findUnique: vi.fn().mockResolvedValue({
          id: "vendor",
          status: VendorStatus.APPROVED,
        }),
      },
    } as unknown as PrismaService;
    const service = new AdminService(prisma, {} as VendorsService);
    await expect(
      service.rejectVendor("vendor", "admin", "Invalid transition"),
    ).rejects.toThrow("must be suspended, not rejected");
  });

  it("does not suspend a vendor before approval", async () => {
    const prisma = {
      vendor: {
        findUnique: vi.fn().mockResolvedValue({
          id: "vendor",
          status: VendorStatus.PENDING,
        }),
      },
    } as unknown as PrismaService;
    const service = new AdminService(prisma, {} as VendorsService);
    await expect(
      service.suspendVendor(
        "vendor",
        "admin",
        VendorSuspensionReason.OTHER,
      ),
    ).rejects.toThrow("Only an approved vendor can be suspended");
  });

  it("requires every physical inspection check before passing", async () => {
    const prisma = {
      vendorInspection: {
        findUnique: vi.fn().mockResolvedValue({
          id: "inspection",
          vendorId: "vendor",
          status: InspectionStatus.IN_PROGRESS,
        }),
      },
    } as unknown as PrismaService;
    const service = new VendorInspectionsService(
      prisma,
      {} as VendorsService,
    );
    await expect(
      service.update("inspection", "admin", {
        status: InspectionStatus.PASSED,
        checklist: { businessActivityVerified: true },
        documentsVerified: true,
        premisesVerified: true,
        qualityVerified: false,
      }),
    ).rejects.toThrow("must all be verified");
  });

  it("requires business activity verification before passing", async () => {
    const prisma = {
      vendorInspection: {
        findUnique: vi.fn().mockResolvedValue({
          id: "inspection",
          vendorId: "vendor",
          status: InspectionStatus.IN_PROGRESS,
        }),
      },
    } as unknown as PrismaService;
    const service = new VendorInspectionsService(
      prisma,
      {} as VendorsService,
    );
    await expect(
      service.update("inspection", "admin", {
        status: InspectionStatus.PASSED,
        checklist: { businessActivityVerified: false },
        documentsVerified: true,
        premisesVerified: true,
        qualityVerified: true,
      }),
    ).rejects.toThrow("Business activity must be verified");
  });

  it("allows an administrator to schedule a verified registered vendor", async () => {
    const create = vi.fn().mockResolvedValue({ id: "inspection" });
    const transition = vi.fn().mockResolvedValue({ status: VendorStatus.INSPECTION });
    const prisma = {
      vendor: {
        findUnique: vi.fn().mockResolvedValue({ status: VendorStatus.REGISTERED }),
      },
      vendorInspection: {
        findFirst: vi.fn().mockResolvedValue(null),
        create,
      },
    } as unknown as PrismaService;
    const vendors = {
      assertKycVerified: vi.fn().mockResolvedValue(undefined),
      transition,
    } as unknown as VendorsService;
    const service = new VendorInspectionsService(prisma, vendors);
    await service.create("vendor", "admin", {
      scheduledAt: "2026-09-21T10:00:00.000Z",
      location: "Vendor premises",
      checklist: {},
    });
    expect(create).toHaveBeenCalledOnce();
    expect(transition).toHaveBeenCalledWith(
      "vendor",
      "admin",
      VendorStatus.INSPECTION,
      "Physical inspection scheduled",
    );
  });

  it("requires a reason when an inspection fails or needs review", async () => {
    const prisma = {
      vendorInspection: {
        findUnique: vi.fn().mockResolvedValue({
          id: "inspection",
          vendorId: "vendor",
          status: InspectionStatus.IN_PROGRESS,
        }),
      },
    } as unknown as PrismaService;
    const service = new VendorInspectionsService(
      prisma,
      {} as VendorsService,
    );
    await expect(
      service.update("inspection", "admin", {
        status: InspectionStatus.NEEDS_REVIEW,
        documentsVerified: true,
        premisesVerified: false,
        qualityVerified: true,
      }),
    ).rejects.toThrow("A reason is required");
  });

  it("persists a rescheduled inspection through the existing update flow", async () => {
    const update = vi.fn().mockResolvedValue({ id: "inspection" });
    const auditCreate = vi.fn().mockResolvedValue({ id: "audit" });
    const prisma = {
      vendorInspection: {
        findUnique: vi.fn().mockResolvedValue({
          id: "inspection",
          vendorId: "vendor",
          status: InspectionStatus.SCHEDULED,
          scheduledAt: new Date("2026-09-20T10:00:00.000Z"),
          location: "Old location",
        }),
        update,
      },
      auditLog: { create: auditCreate },
    } as unknown as PrismaService;
    const service = new VendorInspectionsService(
      prisma,
      {} as VendorsService,
    );
    await service.update("inspection", "admin", {
      status: InspectionStatus.SCHEDULED,
      scheduledAt: "2026-09-21T10:00:00.000Z",
      location: "New location",
      documentsVerified: false,
      premisesVerified: false,
      qualityVerified: false,
    });
    expect(update).toHaveBeenCalledOnce();
    const [updateInput] = update.mock.calls[0] as unknown as [
      { data: { scheduledAt: Date; location: string } },
    ];
    expect(updateInput.data.scheduledAt).toEqual(
      new Date("2026-09-21T10:00:00.000Z"),
    );
    expect(updateInput.data.location).toBe("New location");
    expect(auditCreate).toHaveBeenCalledOnce();
  });
});

describe("vendor ownership", () => {
  it("does not return an order belonging to another vendor", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const prisma = {
      vendorOrder: { findFirst },
    } as unknown as PrismaService;
    const vendors = {
      getVendorId: vi.fn().mockResolvedValue("vendor-a"),
    } as unknown as VendorsService;
    const service = new OrdersService(
      prisma,
      vendors,
      {} as ConfigService,
      {} as NotificationsService,
    );
    await expect(service.vendorGet("user-a", "vendor-b-order")).rejects.toThrow(
      NotFoundException,
    );
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "vendor-b-order", vendorId: "vendor-a" },
      }),
    );
  });
});
