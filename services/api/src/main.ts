import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const config = new DocumentBuilder()
  .setTitle("FactoryFlow API")
  .setDescription("Backend APIs for FactoryFlow")
  .setVersion("1.0")
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup("docs", app, document);


  await app.listen(3000);

  const server: any = app.getHttpAdapter().getInstance();
  const stack = server?._router?.stack ?? [];
  const routes = stack
    .filter((l: any) => l.route)
    .map((l: any) => ({
      path: l.route.path,
      methods: Object.keys(l.route.methods),
    }));
  console.log("ROUTES:", routes);
}
bootstrap();
