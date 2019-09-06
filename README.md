# kuzzle-plugin-auth-passport-google-token

This plugin provides a way to verify `access_token` provided by any client authorized by your Google Sign-In applications.

# Configuration

### Full configuration:

```json
{
  "strategyCredentials": {
    "audiance": ["<google_client_id>"]
  },
  "identifierAttribute": "email",
}
```

### Full configuration:

```json
{
  "strategyCredentials": {
    "audiance": ["<google_android_client_id>", "<google_web_client_id>"]
  },
  "contentMapping": {
    "firstname": "given_name",
    "lastname": "family_name",
    "email": "email",
    "picture.url": "picture"
  },
  "updateUserCredentials": true,
  "identifierAttribute": "email"
}
```


* `strategyCredentials`: used to verify token validity from google api:
  * `audiance`: list of `client_id` allowed to provide token for your application.  
  *see: https://developers.google.com/identity/sign-in/web/backend-auth and https://console.developers.google.com/apis/credentials*
* `identifierAttribute`: used to match Kuzzle user `kuid`
* `contentMapping`: *(default: `null`)* persist Google user profile fields as default user content.  
*(available fields: `id`, `email`, `verified_email`, `name`, `given_name`, `family_name`, `picture`, `locale`)*
* `updateUserCredentials`: *(default: `false`)* if `true`, create credentials for `google-token` strategy on login if user already exists, otherwise user should request `/credentials/google-token/_me/_create` controller

# Usage

Ask user to generate an `access_token` from your frontend application (mobile, web, desktop) then login with `google-token` strategy:

```json
{
  "controller": "auth",
  "action": "login",
  "strategy": "google-token",
  "body": {
    "access_token": "<google_user_access_token>",
  }
}
```


# About Kuzzle

For UI and linked objects developers, [Kuzzle](https://github.com/kuzzleio/kuzzle) is an open-source solution that handles all the data management
(CRUD, real-time storage, search, high-level features, etc).

[Kuzzle](https://github.com/kuzzleio/kuzzle) features are accessible through a secured API. It can be used through a large choice of protocols such as REST, Websocket or Message Queuing protocols.