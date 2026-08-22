import { LocationService } from './LocationService';
import { EmergencyPacketFactory } from './EmergencyPacketFactory';
import { PacketRepository } from '../storage/repositories/PacketRepository';
import type { StoredPacket } from '../storage/db';
import { v4 as uuidv4 } from 'uuid';

export class SosService {
  /**
   * Retrieves or generates a pseudonymous device ID for this browser instance.
   */
  static getSenderId(): string {
    let senderId = localStorage.getItem('rescuenet_sender_id');
    if (!senderId) {
      senderId = `device_${uuidv4()}`;
      localStorage.setItem('rescuenet_sender_id', senderId);
    }
    return senderId;
  }

  /**
   * Generates an SOS packet (optionally with location), saves it locally to the Queue,
   * and returns the generated StoredPacket.
   */
  static async sendSOS(withLocation: boolean): Promise<StoredPacket> {
    let location = null;
    
    if (withLocation) {
      location = await LocationService.getCurrentLocation();
    }

    const senderId = this.getSenderId();
    const packet = EmergencyPacketFactory.createSOSPacket(senderId, location);
    
    // Store in offline queue
    await PacketRepository.savePacket(packet, 'PENDING');
    
    // We return it with the PENDING state as the network layer handles transmission.
    return { ...packet, state: 'PENDING', retryCount: 0 };
  }
}
