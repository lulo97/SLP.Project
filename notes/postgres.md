# 1. PosgreSQL server structure

Open pgAdmin4 then we'll see Servers -> PosgreSQL 18 -> Databases -> postgres -> Schemas -> public
- A instance of posgresql = A server have own engine and running by a computer/pc
- A instance can has multiple databases and databases are isolated
    + Database A can't access database B
- A database can has multiple schemas and schemas is like a folder/namespace for a database
    + Default namespace = public
    + Big project -> Group tables into schemas, small project -> Just use schema public
- In pgAdmin4 example we have 1 server = PosgreSQL 18, 1 database = postgres, 1 schema = public

    SELECT 
        current_database() AS database,
        current_user AS user,
        current_schema() AS schema;

    -- "database"	"user"	"schema"
    -- "postgres"	"postgres"	"public"