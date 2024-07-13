import nodemailer from "nodemailer";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";
import { dayjs } from "../lib/dayjs";

export async function createTrip(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/trips",
    {
      schema: {
        body: z.object({
          destination: z.string().min(4),
          startsAt: z.coerce.date(),
          endsAt: z.coerce.date(),
          ownerName: z.string(),
          ownerEmail: z.string().email(),
          emailsToInvite: z.array(z.string().email()),
        }),
      },
    },
    async (resquet) => {
      const {
        destination,
        startsAt,
        endsAt,
        ownerName,
        ownerEmail,
        emailsToInvite,
      } = resquet.body;

      if (dayjs(startsAt).isBefore(new Date())) {
        throw new Error("Invalid trip start date.");
      }

      if (dayjs(endsAt).isBefore(startsAt)) {
        throw new Error("Invalid trip end date.");
      }

      const trip = await prisma.trip.create({
        data: {
          destination,
          starts_at: startsAt,
          ends_at: endsAt,
          participants: {
            createMany: {
              data: [
                {
                  email: ownerEmail,
                  name: ownerName,
                  is_owner: true,
                  is_confirmed: true,
                },
                ...emailsToInvite.map((email) => {
                  return { email };
                }),
              ],
            },
          },
        },
      });

      const formattedStartDate = dayjs(startsAt).format("LL");
      const formattedEndDate = dayjs(endsAt).format("LL");

      const confirmationLink = `http://localhost:3333/trips/${trip.id}/confirm`;

      const mail = await getMailClient();

      const message = await mail.sendMail({
        from: {
          name: "Equipe plann.er",
          address: "oi@plann.er",
        },
        to: {
          name: ownerName,
          address: ownerEmail,
        },
        subject: `Confirme sua viagem para ${destination} em ${formattedStartDate}`,
        html: `
          <div style="font-family: sans-serif; font-size: 16px; line-height: 1.6;">
            <p>Você solicitou a criação de uma viagem para <strong>${destination}</strong> nas datas de <strong>${formattedStartDate}</strong> até <strong>${formattedEndDate}</strong>.</p>

            <p></p>

            <p>Para confirmar sua viagem, clique no link abaixo:</p>

            <p></p>

            <p>
              <a href="${confirmationLink}">Confirmar viagem</a>
            </p>

            <p></p>

            <p>Caso você não saiba do que se trata esse e-mail, apenas ignore esse e-mail.</p>
          </div>
        `.trim(),
      });

      console.log(nodemailer.getTestMessageUrl(message));

      return { tripId: trip.id };
    },
  );
}
