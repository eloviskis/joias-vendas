import axios from 'axios';

export interface WhatsAppMessage {
  to: string;
  body: string;
  mediaUrl?: string;
}

export interface WhatsAppProvider {
  send(msg: WhatsAppMessage): Promise<void>;
}

export class MockProvider implements WhatsAppProvider {
  async send(msg: WhatsAppMessage) {
    console.log('[Mock WhatsApp]', { to: msg.to, body: msg.body.substring(0, 50) });
  }
}

export class TwilioProvider implements WhatsAppProvider {
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly from: string;

  constructor(accountSid: string, authToken: string, from: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.from = from;
  }

  async send(msg: WhatsAppMessage) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    
    const data = new URLSearchParams();
    data.append('From', `whatsapp:${this.from}`);
    data.append('To', `whatsapp:${msg.to}`);
    data.append('Body', msg.body);
    if (msg.mediaUrl) {
      data.append('MediaUrl', msg.mediaUrl);
    }

    await axios.post(url, data, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }
}

export class MetaProvider implements WhatsAppProvider {
  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor(token: string, phoneNumberId: string) {
    this.token = token;
    this.phoneNumberId = phoneNumberId;
  }

  async send(msg: WhatsAppMessage) {
    const url = `https://graph.facebook.com/v18.0/${this.phoneNumberId}/messages`;
    
    const payload: any = {
      messaging_product: 'whatsapp',
      to: msg.to,
      type: 'text',
      text: { body: msg.body }
    };

    if (msg.mediaUrl) {
      payload.type = 'image';
      payload.image = { link: msg.mediaUrl };
      delete payload.text;
    }

    await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
  }
}

export function createProvider(type: string, config: any): WhatsAppProvider {
  switch (type.toLowerCase()) {
    case 'twilio':
      return new TwilioProvider(config.accountSid, config.authToken, config.from);
    case 'meta':
      return new MetaProvider(config.token, config.phoneNumberId);
    default:
      return new MockProvider();
  }
}
