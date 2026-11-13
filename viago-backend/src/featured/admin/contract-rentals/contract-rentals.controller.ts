import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import {
  AccountScope,
  AccountsDatabaseFilter,
  AccountsGuard,
  Permission,
} from '../../../shared/accounts/accounts-access';
import type { AccountRequest } from '../../../shared/accounts/accounts-access';
import { SupportRateGuard } from '../../customer/chatbot/auth/chatbot.auth';
import { validation } from '../../customer/chatbot/common/chatbot.validation';
import {
  AssignmentsDto,
  CancelDto,
  ContractCreateDto,
  ContractStatusDto,
  PaymentCreateDto,
  PriceListUpdateDto,
  QuoteCreateDto,
  QuoteDecisionDto,
  RentalContractsQueryDto,
  RentalQuotesQueryDto,
  RentalRequestsQueryDto,
} from './contract-rentals.dto';
import { AdminContractRentalsService } from './contract-rentals.service';

@Controller('admin/contract-rentals')
@UseGuards(SupportRateGuard, AccountsGuard)
@AccountScope('admin')
@Permission('QuanLyYeuCauThueXe')
@UsePipes(validation)
@UseFilters(AccountsDatabaseFilter)
export class AdminContractRentalsController {
  constructor(private readonly service: AdminContractRentalsService) {}

  @Get('summary') summary() {
    return this.service.summary();
  }

  @Get('vehicle-types') vehicleTypes() {
    return this.service.vehicleTypes();
  }

  // ----- Bảng giá chuẩn -----
  @Get('price-list') priceList() {
    return this.service.priceList();
  }
  @Patch('price-list/:id') updatePrice(@Param('id') id: string, @Body() dto: PriceListUpdateDto, @Req() req: AccountRequest) {
    return this.service.updatePrice(id, dto, req.identity, req);
  }

  // ----- Yêu cầu -----
  @Get('requests') requests(@Query() q: RentalRequestsQueryDto) {
    return this.service.requests(q);
  }
  @Get('requests/:id') request(@Param('id') id: string) {
    return this.service.request(id);
  }
  @Patch('requests/:id/cancel') cancelRequest(@Param('id') id: string, @Body() dto: CancelDto, @Req() req: AccountRequest) {
    return this.service.cancelRequest(id, dto, req.identity, req);
  }
  @Post('requests/:id/quotes') createQuote(@Param('id') id: string, @Body() dto: QuoteCreateDto, @Req() req: AccountRequest) {
    return this.service.createQuote(id, dto, req.identity, req);
  }

  // ----- Báo giá -----
  @Get('quotes') quotes(@Query() q: RentalQuotesQueryDto) {
    return this.service.quotes(q);
  }
  @Get('quotes/:id') quote(@Param('id') id: string) {
    return this.service.quote(id);
  }
  @Patch('quotes/:id/decision') decideQuote(@Param('id') id: string, @Body() dto: QuoteDecisionDto, @Req() req: AccountRequest) {
    return this.service.decideQuote(id, dto, req.identity, req);
  }
  @Post('quotes/:id/contract') createContract(@Param('id') id: string, @Body() dto: ContractCreateDto, @Req() req: AccountRequest) {
    return this.service.createContract(id, dto, req.identity, req);
  }

  // ----- Hợp đồng -----
  @Get('contracts') contracts(@Query() q: RentalContractsQueryDto) {
    return this.service.contracts(q);
  }
  @Get('contracts/:id') contract(@Param('id') id: string) {
    return this.service.contract(id);
  }
  @Get('contracts/:id/assignment-options') assignmentOptions(@Param('id') id: string) {
    return this.service.assignmentOptions(id);
  }
  @Put('contracts/:id/assignments') assign(@Param('id') id: string, @Body() dto: AssignmentsDto, @Req() req: AccountRequest) {
    return this.service.assign(id, dto, req.identity, req);
  }
  @Post('contracts/:id/payments') addPayment(@Param('id') id: string, @Body() dto: PaymentCreateDto, @Req() req: AccountRequest) {
    return this.service.addPayment(id, dto, req.identity, req);
  }
  @Patch('contracts/:id/status') status(@Param('id') id: string, @Body() dto: ContractStatusDto, @Req() req: AccountRequest) {
    return this.service.updateContractStatus(id, dto, req.identity, req);
  }
}
