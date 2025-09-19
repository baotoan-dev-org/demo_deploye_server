import { Column, Entity, Unique } from "typeorm";
import { SocialPlatform } from "../social-media-interaction.enum";
import { BaseEntity } from "@/common/entities/base.entity";

@Entity()
@Unique(["socialPlatform", "year", "month"])
export class SocialMediaInteraction extends BaseEntity {
  @Column({type: 'enum', enum: SocialPlatform, comment: 'Social media platform'})
  socialPlatform: SocialPlatform;

  @Column()
  year: number;

  @Column()  
  month: number;

  @Column()
  followerCount: number;

  @Column({default: 0})
  likeCount: number;
}