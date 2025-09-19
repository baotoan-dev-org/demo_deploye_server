import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoomPurpose } from '../entities/room-purpose.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RoomPurposeService {
  constructor(
    @InjectRepository(RoomPurpose)
    private readonly roomPurposeRepository: Repository<RoomPurpose>,
  ) {}
}
