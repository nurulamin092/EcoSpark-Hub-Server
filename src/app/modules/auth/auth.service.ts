import { UserStatus } from "../../../generated/prisma/enums";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import { tokenUtils } from "../../utils/token";
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
  try {
    const accessToken = tokenUtils.getAccessToken({
      userId: data.user.id,
      role: data.user.role,
      name: data.user.name,
      email: data.user.email,
      status: data.user.status,
      isDeleted: data.user.isDeleted,
      emailVerified: data.user.emailVerified,
    });

    const refreshToken = tokenUtils.getRefreshToken({
      userId: data.user.id,
      role: data.user.role,
      name: data.user.name,
      email: data.user.email,
      status: data.user.status,
      isDeleted: data.user.isDeleted,
      emailVerified: data.user.emailVerified,
    });

    return {
      ...data,
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.log("Transaction error : ", error);
    await prisma.user.delete({
      where: {
        id: data.user.id,
      },
    });
    throw error;
  }
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
