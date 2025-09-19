import { Body, Post } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { Route } from 'src/common/decorators/route.decorator';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { LoginDto } from '../dtos/login.dto';
import { LogoutDto } from '../dtos/logout.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { SubscribeUnsubscribeTopicDto } from '../dtos/subscribe-unsubscribe-topic.dto';
import { GenerateTokenVerifyEmailDto } from '../dtos/generate-token-verify-email.dto';
import { JwtAuth } from 'src/common/decorators/jwt-auth.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { VerifyOtpDto } from '../dtos/verify-otp.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';

@Route('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Generate token verify email' })
  @Post('generate-token-verify-email')
  generateTokenVerifyEmail(@Body() generateTokenVerifyEmailDto: GenerateTokenVerifyEmailDto) {
    return this.authService.generateTokenVerifyEmail(generateTokenVerifyEmailDto);
  }

  // @ApiOperation({ summary: 'Verify email' })
  // @Post('verify-email')
  // verifyEmail(@Body() verifyEmailDto: TokenDto) {
  //   return this.authService.verifyEmail(verifyEmailDto);
  // }

  @ApiOperation({ summary: 'Login' })
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Logout' })
  @JwtAuth()
  @Post('logout')
  logout(@Body() logoutDto: LogoutDto, @User() user: UserRequest) {
    return this.authService.logout(logoutDto, user);
  }

  @ApiOperation({ summary: 'Forgot password' })
  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @ApiOperation({ summary: 'Verify otp' })
  @Post('verify-otp')
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  @ApiOperation({ summary: 'Reset password' })
  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @ApiOperation({ summary: 'Refresh token' })
  @Post('refresh-token')
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @ApiOperation({ summary: 'Subscribe topic' })
  @JwtAuth()
  @Post('subscribe-topic')
  subscribeTopic(
    @Body() subscribeTopicDto: SubscribeUnsubscribeTopicDto,
    @User() user: UserRequest,
  ) {
    return this.authService.subscribeUnsubscribeTopic(subscribeTopicDto, true, user);
  }

  @ApiOperation({ summary: 'Unsubscribe topic' })
  @JwtAuth()
  @Post('unsubscribe-topic')
  unsubscribeTopic(
    @Body() unsubscribeTopicDto: SubscribeUnsubscribeTopicDto,
    @User() user: UserRequest,
  ) {
    return this.authService.subscribeUnsubscribeTopic(unsubscribeTopicDto, false, user);
  }
}
