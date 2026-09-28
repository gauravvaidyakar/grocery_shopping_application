import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../common/request-user";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { AuthService } from "./auth.service";
import {
  ForgotPasswordDto,
  ChangeVendorPasswordDto,
  CustomerOtpChallengeDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyOtpDto,
  VerifyCustomerOtpDto,
} from "./auth.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { Throttle } from "@nestjs/throttler";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post("register")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  register(@Body() input: RegisterDto) {
    return this.auth.register(input);
  }
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  login(@Body() input: LoginDto) {
    return this.auth.login(input);
  }
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  refresh(@Body() input: RefreshDto) {
    return this.auth.refresh(input);
  }
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  forgotPassword(@Body() input: ForgotPasswordDto) {
    return this.auth.forgotPassword(input);
  }
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  resetPassword(@Body() input: ResetPasswordDto) {
    return this.auth.resetPassword(input);
  }
  @Post("customer/otp/resend")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  resendCustomerOtp(@Body() input: CustomerOtpChallengeDto) {
    return this.auth.resendCustomerOtp(input.challengeToken);
  }
  @Post("customer/otp/verify")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  verifyCustomerOtp(@Body() input: VerifyCustomerOtpDto) {
    return this.auth.verifyCustomerAccountOtp(input.challengeToken, input.accessToken);
  }
  @Post("customer/password-reset/verify-otp")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  verifyCustomerPasswordResetOtp(@Body() input: VerifyCustomerOtpDto) {
    return this.auth.verifyPasswordResetOtp(input.challengeToken, input.accessToken);
  }
  @Post("request-verification-otp")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.VENDOR)
  requestVerificationOtp(@CurrentUser() user: RequestUser) {
    return this.auth.requestVerificationOtp(user.id);
  }
  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.VENDOR)
  verifyOtp(@CurrentUser() user: RequestUser, @Body() input: VerifyOtpDto) {
    return this.auth.verifyOtp(user.id, input);
  }
  @Post("vendor/change-password")
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.VENDOR)
  changeVendorPassword(
    @CurrentUser() user: RequestUser,
    @Body() input: ChangeVendorPasswordDto,
  ) {
    return this.auth.changeVendorPassword(user.id, input);
  }
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: RequestUser): Promise<void> {
    await this.auth.logout(user.id);
  }
}
