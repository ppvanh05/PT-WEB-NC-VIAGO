import { Module } from '@nestjs/common';
import { AdminRoutesModule } from './routes/routes.module';
import { AdminSchedulesModule } from './schedules/schedules.module';
import { AdminPickupDropoffModule } from './pickup-dropoff/pickup-dropoff.module';
import { AdminVehiclesModule } from './vehicles/vehicles.module';
import { AdminDriversAssistantsModule } from './drivers-assistants/drivers-assistants.module';

@Module({
  imports: [
    AdminRoutesModule,
    AdminSchedulesModule,
    AdminPickupDropoffModule,
    AdminVehiclesModule,
    AdminDriversAssistantsModule,
  ],
})
export class AdminDispatchModule {}