import { Controller, Get, Param } from '@nestjs/common';
import { UpstoxService } from './upstox.service';
//import { AddUpstoxAccountDto } from './dto/add-upstox-account.dto';
//import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('upstox')
export class UpstoxController {
  constructor(private readonly upstoxService: UpstoxService) {}

  // @Post('add')
  // async addAccount(@Body() dto: AddUpstoxAccountDto) {
  //   return this.upstoxService.addAccount(dto);
  // }

  @Get('login-url/:id')
  async getLoginUrl(@Param('id') id: string) {
    return this.upstoxService.getLoginUrl(id);
  }

  // @Post('save-auth-code/:id')
  // async saveCode(@Param('id') id: string, @Query('code') code: string) {
  //   return this.upstoxService.saveAuthCode(id, code);
  // }

  // @Post('exchange-token/:id')
  // async exchange(@Param('id') id: string) {
  //   return this.upstoxService.exchangeCodeForTokens(id);
  // }

  // @Post('refresh-token')
  // async refresh(@Body() dto: RefreshTokenDto) {
  //   return this.upstoxService.refreshAccessToken(dto.id);
  // }

  // @Get('accounts')
  // async getAll() {
  //   return this.upstoxService.listAccounts();
  // }
}
