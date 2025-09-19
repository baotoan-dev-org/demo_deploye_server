import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';

@Controller()
export class KafkaController {
  // @MessagePattern('user.created')
  // async handleUserCreated(@Payload() message: any, @Ctx() context: KafkaContext) {
  //   console.log('Received user created message from preal-user:', message);
  //   console.log('Topic:', context.getTopic());
  //   console.log('Partition:', context.getPartition());
  //   console.log('Message:', context.getMessage());
  //   // Process your business logic here
  //   return { status: 'processed', data: message };
  // }
  // @MessagePattern('user.activity')
  // async handleUserActivity(@Payload() message: any, @Ctx() context: KafkaContext) {
  //   console.log('Received user activity from preal-user:', message);
  //   console.log('Topic:', context.getTopic());
  //   console.log('User ID:', message.userId);
  //   console.log('Action:', message.action);
  //   console.log('Timestamp:', message.timestamp);
  //   // Process user activity logic here
  //   return { status: 'activity_processed', data: message };
  // }
  // @MessagePattern('order.processed')
  // async handleOrderProcessed(@Payload() data: any) {
  //   console.log('Order processed:', data);
  //   // Handle order processing logic
  //   return { acknowledged: true };
  // }
}
