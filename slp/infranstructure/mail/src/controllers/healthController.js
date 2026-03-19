export class HealthController {
  constructor(healthService) {
    this.healthService = healthService;
  }

  check(req, res) {
    const status = this.healthService.getStatus();
    res.json(status);
  }
}