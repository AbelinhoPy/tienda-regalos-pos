import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma';

export interface BusinessSettingsData {
  name: string;
  legalName: string;
  ruc: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  ticketFooterMessage?: string;
  logoUrl?: string;
  bannerUrl?: string;
  facebook?: string;
  instagram?: string;
  quoteIntro?: string;
  quoteDefaultValidityDays?: number;
  quoteDefaultPaymentTerms?: string;
  quoteDefaultDeliveryTerms?: string;
  quoteDefaultNotes?: string;
}

const DEFAULT_SETTINGS: BusinessSettingsData = {
  name: 'Florecer',
  legalName: 'Florecer Personalizados y Papelería',
  ruc: '80100254-0',
  phone: '+595 993 346 854',
  email: 'florecerpersonalizadoscde@gmail.com',
  address: 'Avda. Tte. Rojas Silva c/ Patricio Colman',
  city: 'Ciudad del Este',
  ticketFooterMessage: '¡Gracias por su preferencia! Ideas hechas realidad.',
  facebook: 'Florecer Personalizados',
  instagram: 'florecerpersonalizadoscde',
  quoteIntro: 'Por medio de la presente, me dirijo a usted de la manera más atenta y respetuosa, para hacerle llegar nuestro presupuesto actualizado',
  quoteDefaultValidityDays: 8,
  quoteDefaultPaymentTerms: '50% AL CONFIRMAR Y AL FINALIZAR EL TRABAJO 50% RESTANTE',
  quoteDefaultDeliveryTerms: '3 DÍAS HÁBILES',
  quoteDefaultNotes: '',
};

export class BusinessService {
  /**
   * Obtiene la imagen por defecto como data URL base64 si no hay logo personalizado
   */
  public static getDefaultLogoBase64(): string {
    const candidatePaths = [
      path.join(__dirname, '..', '..', 'public', 'uploads', 'florecer_logo.jpg'),
      path.join(__dirname, '..', '..', '..', 'client', 'public', 'florecer_logo.jpg'),
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const buffer = fs.readFileSync(p);
          return `data:image/jpeg;base64,${buffer.toString('base64')}`;
        } catch {
          // fallback
        }
      }
    }
    return '';
  }

  /**
   * Obtiene la configuración de la empresa de la BD
   */
  public static async getSettings(): Promise<BusinessSettingsData> {
    try {
      let record = await (prisma as any).businessSetting.findUnique({
        where: { key: 'default' },
      });

      if (!record) {
        const defaultLogo = this.getDefaultLogoBase64();
        record = await (prisma as any).businessSetting.create({
          data: {
            key: 'default',
            ...DEFAULT_SETTINGS,
            logoUrl: defaultLogo,
          },
        });
      }

      // Si no tiene logoUrl guardado pero existe el logo de Florecer, completarlo
      if (!record.logoUrl) {
        const defaultLogo = this.getDefaultLogoBase64();
        if (defaultLogo) {
          record.logoUrl = defaultLogo;
          await (prisma as any).businessSetting.update({
            where: { key: 'default' },
            data: { logoUrl: defaultLogo },
          }).catch(() => {});
        }
      }

      return {
        name: record.name,
        legalName: record.legalName,
        ruc: record.ruc,
        phone: record.phone,
        email: record.email || '',
        address: record.address,
        city: record.city,
        ticketFooterMessage: record.ticketFooterMessage || '',
        logoUrl: record.logoUrl || '',
        bannerUrl: record.bannerUrl || '',
        facebook: record.facebook || '',
        instagram: record.instagram || '',
        quoteIntro: record.quoteIntro || '',
        quoteDefaultValidityDays: record.quoteDefaultValidityDays || 8,
        quoteDefaultPaymentTerms: record.quoteDefaultPaymentTerms || '',
        quoteDefaultDeliveryTerms: record.quoteDefaultDeliveryTerms || '',
        quoteDefaultNotes: record.quoteDefaultNotes || '',
      };
    } catch (error) {
      console.error('Error al obtener datos de empresa de BD:', error);
      return {
        ...DEFAULT_SETTINGS,
        logoUrl: this.getDefaultLogoBase64(),
      };
    }
  }

  /**
   * Guarda o actualiza los datos de la empresa en la BD
   */
  public static async updateSettings(data: Partial<BusinessSettingsData>): Promise<BusinessSettingsData> {
    const updateData: any = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.legalName !== undefined && { legalName: data.legalName }),
      ...(data.ruc !== undefined && { ruc: data.ruc }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.ticketFooterMessage !== undefined && { ticketFooterMessage: data.ticketFooterMessage }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl }),
      ...(data.facebook !== undefined && { facebook: data.facebook }),
      ...(data.instagram !== undefined && { instagram: data.instagram }),
      ...(data.quoteIntro !== undefined && { quoteIntro: data.quoteIntro }),
      ...(data.quoteDefaultValidityDays !== undefined && { quoteDefaultValidityDays: Number(data.quoteDefaultValidityDays) }),
      ...(data.quoteDefaultPaymentTerms !== undefined && { quoteDefaultPaymentTerms: data.quoteDefaultPaymentTerms }),
      ...(data.quoteDefaultDeliveryTerms !== undefined && { quoteDefaultDeliveryTerms: data.quoteDefaultDeliveryTerms }),
      ...(data.quoteDefaultNotes !== undefined && { quoteDefaultNotes: data.quoteDefaultNotes }),
    };

    const record = await (prisma as any).businessSetting.upsert({
      where: { key: 'default' },
      update: updateData,
      create: {
        key: 'default',
        ...DEFAULT_SETTINGS,
        ...updateData,
      },
    });

    return {
      name: record.name,
      legalName: record.legalName,
      ruc: record.ruc,
      phone: record.phone,
      email: record.email || '',
      address: record.address,
      city: record.city,
      ticketFooterMessage: record.ticketFooterMessage || '',
      logoUrl: record.logoUrl || '',
      bannerUrl: record.bannerUrl || '',
      facebook: record.facebook || '',
      instagram: record.instagram || '',
      quoteIntro: record.quoteIntro || '',
      quoteDefaultValidityDays: record.quoteDefaultValidityDays || 8,
      quoteDefaultPaymentTerms: record.quoteDefaultPaymentTerms || '',
      quoteDefaultDeliveryTerms: record.quoteDefaultDeliveryTerms || '',
      quoteDefaultNotes: record.quoteDefaultNotes || '',
    };
  }
}
