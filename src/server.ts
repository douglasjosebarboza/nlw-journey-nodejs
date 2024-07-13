import fastify from "fastify";
import cors from "@fastify/cors";
import { createTrip } from "./routes/create-trips";
import { confirmTrip } from "./routes/confirm-trip";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

const app = fastify();
app.register(cors, {
  origin: "http://localhost:3000",
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(createTrip);
app.register(confirmTrip);

app.listen({ port: 3333 }).then(() => {
  console.log("Server running!");
});
