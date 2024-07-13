import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { dayjs } from "../lib/dayjs";
import { prisma } from "../lib/prisma";

export async function createActivity(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    "/trips/:tripId/activities",
    {
      schema: {
        params: z.object({
          tripId: z.string().uuid(),
        }),
        body: z.object({
          title: z.string().min(4),
          occursAt: z.coerce.date(),
        }),
      },
    },
    async (request) => {
      const { tripId } = request.params;
      const { title, occursAt } = request.body;

      const trip = await prisma.trip.findUnique({
        where: {
          id: tripId,
        },
      });

      if (!trip) {
        throw new Error("Trip not found");
      }

      if (dayjs(occursAt).isBefore(trip.starts_at)) {
        throw new Error("Invalid activity date");
      }

      if (dayjs(occursAt).isAfter(trip.ends_at)) {
        throw new Error("Invalid activity date");
      }

      const activity = await prisma.activity.create({
        data: {
          title,
          occurs_at: occursAt,
          tripId,
        },
      });

      return { activityId: activity.id };
    },
  );
}
