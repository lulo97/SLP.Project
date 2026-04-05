Services lifetime = Define how services in Dotnet created/destroyed
- Singleton = Created one, shared between requests, destroyed when application close
- Scoped = Created one per request, isolated with other requests
- Transient = Created one everytime called, can exist multiple instance inside a single request.