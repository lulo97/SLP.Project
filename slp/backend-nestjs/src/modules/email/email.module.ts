@Module({
  providers: [
    {
      provide: 'IEmailService',
      useClass: EmailService,
    },
  ],
  exports: ['IEmailService'],
})
export class EmailModule {}