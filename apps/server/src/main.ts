import 'reflect-metadata'
import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { join } from 'path'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { ResponseInterceptor } from './common/response.interceptor'
import { HttpExceptionFilter } from './common/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  app.enableCors({ origin: '*' })
  app.useGlobalInterceptors(new ResponseInterceptor())
  app.useGlobalFilters(new HttpExceptionFilter())

  // 静态文件托管：public/uploads/ 下的文件可通过 /uploads/xxx 访问
  app.useStaticAssets(join(process.cwd(), 'public'), { prefix: '/' })

  const port = Number(process.env.PORT!)
  await app.listen(port)
  console.log(`🚀 YES Server running on http://localhost:${port}`)
}

bootstrap()
