export class EpicServiceError {
  static create(
    errorCode: string,
    errorMessage: string,
    numericErrorCode: number = 1000,
    originatingService: string = "fortnite",
    intent: string = "prod10",
    messageVars: string[] = []
  ) {
    return {
      errorCode,
      errorMessage,
      messageVars,
      numericErrorCode,
      originatingService,
      intent,
      error_description: errorMessage,
      error: errorCode,
    };
  }

  static badRequest(message: string = "Invalid request") {
    return this.create("errors.com.epicgames.common.bad_request", message, 400);
  }

  static notFound(message: string = "Resource not found") {
    return this.create("errors.com.epicgames.common.not_found", message, 404);
  }

  static unauthorized(message: string = "Authentication failed") {
    return this.create("errors.com.epicgames.common.authorization.authorization_failed", message, 1032);
  }

  static banned(reason: string = "You have been banned.") {
    return this.create("errors.com.epicgames.account.account_not_active", reason, -1);
  }
}

export default EpicServiceError;
