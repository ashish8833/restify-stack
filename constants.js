export default class Constant {
  static loggingEnabled = true;
  static loggingDefaultLevel = "info";
  static loggingEngines = [
      {
        "name": "console",
        "enabled": true,
        "timestamp": true
      },
      {
        "name": "bunyan",
        "enabled": true,
        "logName": "app-server",
        "type": "rotating-file",
        "path": "./logs/app-server-messages.log",
        "period": "1d",
        "count": 30
      }
  ];
  static developmentMode = false;
  static rollbar = {
    name: "GenericServerFramework",
    accessToken: "5e72b1ccbabb4f2e8e15e2ce37e8438b"
  };
  static userManager = {
    store: "db",
    storeConfig: {
        fs: {
        path: { 
          users: [
            {
              "username": "admin",
              "apiKey": "super_secret_apikey",
              "accessToken": "super_secret_token",
              "password": "super_secret_password",
              "roles": ["*"]
            },
            {
              "username": "test",
              "apiKey": "test_apikey",
              "accessToken": "test_token",
              "password": "test",
              "roles": ["test_role"]
            }]
          }
        },
        db: {}
    }
  };
  static allowCorsForDomains = [
    "https://www.lofty.com"
  ];
}

