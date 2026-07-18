import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: '*' })

  const port = Number(process.env.PORT!)
  await app.listen(port)
  console.log(`🚀 YES Server running on http://localhost:${port}`)
}

bootstrap()
