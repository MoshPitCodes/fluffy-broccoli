import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { User } from "../entities/User";
import { MyContext } from "../types";
import argon2 from "argon2";

@ObjectType()
class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;
  @Field()
  password: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];
  @Field(() => User, { nullable: true })
  user?: User;
}

/* -------------------------
GraphQL Resolver for User
------------------------- */
@Resolver()
export class UserResolver {
  /* -------------------------
  User check
  ------------------------- */
  @Query(() => User, { nullable: true })
  async me(@Ctx() { em, req }: MyContext) {
    //console.log("session: ", req.session);
    if (!req.session.userID) {
      //User not logged in
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userID });
    return user;
  }

  /* -------------------------
  User registration
  ------------------------- */
  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    // If username already exists -> error
    const userCheck = await em.findOne(User, { username: options.username });

    if (userCheck && userCheck.username === options.username) {
      return {
        errors: [
          {
            field: "username",
            message: "Username already exists.",
          },
        ],
      };
    }
    // If username contains less than 5 characters-> error
    if (options.username.length <= 5) {
      return {
        errors: [
          {
            field: "username",
            message: "Username is too short.",
          },
        ],
      };
    }

    // If password contains less than 16 characters -> error
    if (options.password.length <= 16) {
      return {
        errors: [
          {
            field: "password",
            message: "Password must be at least 16 characters.",
          },
        ],
      };
    }
    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
    });
    await em.persistAndFlush(user);

    // Store user id session
    // this will set a cookie on the user and keep them logged in
    req.session.userID = user.id;

    // If all is good
    return { user };
  }

  /* -------------------------
  User login
  ------------------------- */
  @Mutation(() => UserResponse)
  async login(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, {
      username: options.username.toLowerCase(),
    });

    // Check for existing user
    if (!user) {
      return {
        errors: [
          {
            field: "username",
            message: "Username does not exist",
          },
        ],
      };
    }

    // Check for valid password
    const valid = await argon2.verify(user.password, options.password);

    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "Password is wrong",
          },
        ],
      };
    }

    //HINT: ###Check implementation for storing userId;
    // with older version of express-session (v1.17.0)
    //req-session.userId ) user.id;
    req.session.userID = user.id;

    // If all is good
    return { user };
  }
}
