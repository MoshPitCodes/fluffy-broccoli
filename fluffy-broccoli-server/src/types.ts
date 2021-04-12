import { EntityManager, IDatabaseDriver, Connection } from "@mikro-orm/core";
import { Request, Response } from "express";
import { Session, SessionData } from "express-session";

//HINT: ###Check implementation for storing userId
//with older version of express-session (v1.17.0)
//import Express from "express-session";
//req: Request & {session?: Express.Session}

export type MyContext = {
  em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>; // MikroORM attribute
  req: Request & {
    session: Session & Partial<SessionData> & { userID: number };
  };
  res: Response; // express-session / redis
};
