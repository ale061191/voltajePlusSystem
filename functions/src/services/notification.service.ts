import * as nodemailer from 'nodemailer';
import axios from 'axios';

export class NotificationService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // Configure standard SMTP Transporter for Gmail or others.
        this.transporter = nodemailer.createTransport({
            service: 'gmail', // Can be changed based on ENV
            auth: {
                user: process.env.EMAIL_USER || '',
                pass: process.env.EMAIL_PASS || ''
            }
        });
    }

    /**
     * Send rental confirmation email
     */
    async sendRentalEmail(to: string, userName: string, machineId: string) {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('⚠️ SMTP credentials missing. Skipping email.');
            return;
        }

        try {
            const mailOptions = {
                from: `"Voltaje Plus" <${process.env.EMAIL_USER}>`,
                to,
                subject: '🔋 ¡Tu Power Bank ha sido liberado exitosamente!',
                html: `
                    <h2>Hola, ${userName}</h2>
                    <p>¡Gracias por alquilar con <b>Voltaje Plus</b>!</p>
                    <p>Tu Power Bank en la estación <b>${machineId}</b> ha sido liberado.</p>
                    <p>Recuerda devolverlo en cualquier estación Voltaje antes de que termine tu tiempo para no incurrir en cargos extras.</p>
                    <br/>
                    <p><i>El equipo de Voltaje Plus</i></p>
                `
            };
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        } catch (error) {
            console.error('📧 Error sending email:', error);
        }
    }

    /**
     * Send rental confirmation WhatsApp via Whapi.cloud
     */
    async sendRentalWhatsApp(phone: string, userName: string, machineId: string) {
        const whapiToken = process.env.WHAPI_TOKEN;
        const whapiUrl = process.env.WHAPI_URL || 'https://gate.whapi.cloud/messages/text';

        if (!whapiToken) {
            console.warn('⚠️ Whapi Token missing. Skipping WhatsApp notification.');
            return;
        }

        try {
            // Clean phone number (removing standard prefixes if needed, assumes venezuelan +58 by default if not passed)
            let cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
            if (!cleanPhone.startsWith('58')) cleanPhone = '58' + cleanPhone;

            const payload = {
                to: `${cleanPhone}@s.whatsapp.net`,
                body: `¡Hola ${userName}! 🔋🔌\n\nTu Power Bank en la estación *${machineId}* ha sido liberado con éxito. ¡Gracias por usar Voltaje Plus!`
            };

            const response = await axios.post(whapiUrl, payload, {
                headers: {
                    'Authorization': `Bearer ${whapiToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            console.log(`📱 WhatsApp sent to ${cleanPhone}. Whapi status: ${response.status}`);
        } catch (error: any) {
            console.error('📱 Error sending WhatsApp:', error.response?.data || error.message);
        }
    }
}
