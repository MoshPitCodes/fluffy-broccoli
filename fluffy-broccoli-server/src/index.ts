import { __prod__ } from "./constants";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { MikroORM } from "@mikro-orm/core";
import mikroOrmConfig from "./mikro-orm.config";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import redis from "redis";
import session from "express-session";
import connectRedis from "connect-redis";
//import { MyContext } from "./types";

/* -------------------------
Main app implementation
------------------------- */
const main = async () => {
  /* -------------------------
  MikroORM migrations setup
  ------------------------- */
  const orm = await MikroORM.init(mikroOrmConfig);
  orm.getMigrator().up();

  /* -------------------------
  expressjs server implementation
  ------------------------- */
  const app = express();

  /* -------------------------
  redis and express-session middleware
  ------------------------- */
  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient();

  app.use(
    session({
      name: "nerdAM", // cookie name
      store: new RedisStore({
        client: redisClient,
        disableTouch: true, // disable TTL for session in redis store
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, //10 years
        sameSite: "lax", // CSRF setting
        httpOnly: true, // cannot access cookie in javascript frontend code
        secure: __prod__, // cookie only works in https in production environment
      },
      saveUninitialized: false, // disable create session by default when empty
      secret: "johrsdgkmnljkhaerngpouihsertgj", // secret to sign the cookies
      resave: false,
    })
  );

  /* -------------------------
  apollo middleware using redis and express-session
  ------------------------- */
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    //HINT: ###
    //with older version of express-session
    //context: ({ req, res }): MyContext => ({ em: orm.em, req, res }),
    context: ({ req, res }) => ({ em: orm.em, req, res }),
  });

  apolloServer.applyMiddleware({ app });

  /* -------------------------
  expressjs server startup
  ------------------------- */
  app.get("/", (_, res) => {
    res.send("hello");
  });
  app.listen(4000, () => {
    console.log("----- express server started on localhost:4000");
  });
};

main();
