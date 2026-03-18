import { UserStatus } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";
import { ILoginUserPayload, IRegisterMemberPayload } from "./auth.interface";

const registerMember = async (payload: IRegisterMemberPayload) => {
  const { name, email, password } = payload;

  const data = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
  });

  if (!data.user) {
    throw new Error("Failed to register member");
  }
  return data;
};

const loginUser = async (payload: ILoginUserPayload) => {
  const data = await auth.api.signInEmail({
    body: {
      email: payload.email,
      password: payload.password,
    },
  });

  if (data.user.status === UserStatus.BLOCKED) {
    throw new Error("User is blocked");
  }
  if (data.user.isDeleted || data.user.status === UserStatus.DELETED) {
    throw new Error("User is deleted");
  }
  return data;
};

export const AuthService = {
  registerMember,
  loginUser,
};
