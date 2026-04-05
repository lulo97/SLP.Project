Layered Architechture: A project architecture split code into layers, for example typical layers in DotNet:  
    Controller → Service → Repository → Entity

Controllers = Controllers receive input, usually as events that encode mouse movement, activation of mouse buttons, or keyboard input. Events are translated  to service requests for the model or the view. The user interacts with the system solely through controllers.
    + Source: Pattern-Oriented Software Architecture, Volume 1 - A System Of Patterns

Services = Defines an application's boundary with a set of available operations and coordinates the application's response in each operation.
    + Source: Patterns of Enterprise Application Architecture

Repository = Mediates between the domain and data mapping layers using a collection-like interface for accessing domain objects.
    + Source: Patterns of Enterprise Application Architecture

Entity = An object defined primarily by its identity is called an ENTITY.
    + Source: Domain-Driven Design: Tackling Complexity in the Heart of Software

My own understanding:
- Controllers = Receive input from client, passing data to services
- Services = Perform bussiness logic, calling methods of Repository
    + Services require interface because a bussiness logic goal can be implement in many ways (switching detail implement is easily and objective)
- Repository = Perform direct access to database
    + Repository require interface because a storage can be implement with different databases (switching database is easily and objective) 
- Entity = An unique entity exist in bussiness logic, mapping name with table/column names in database.
    + Required in object relational model framework, if writing SQL directly then entity can be skipped.