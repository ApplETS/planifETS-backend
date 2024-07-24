import { HttpService } from '@nestjs/axios';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class HeaderInterceptor implements NestInterceptor {
  constructor(private readonly httpService: HttpService) {
    this.httpService.axiosRef.interceptors.request.use((config) => {
      config.headers.Accept = 'application/json';
      return config;
    });
  }

  public intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((data) => data));
  }
}
