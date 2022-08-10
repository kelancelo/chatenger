/*
  Warnings:

  - You are about to drop the `_receivedmessages` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `receiverId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `_receivedmessages` DROP FOREIGN KEY `_ReceivedMessages_A_fkey`;

-- DropForeignKey
ALTER TABLE `_receivedmessages` DROP FOREIGN KEY `_ReceivedMessages_B_fkey`;

-- AlterTable
ALTER TABLE `message` ADD COLUMN `receiverId` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `_receivedmessages`;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
