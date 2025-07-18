// utils/tokenOptions.ts
interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  secure?: boolean;
}

export const convertToSeconds = (timeString: string): number => {
  const unit = timeString.slice(-1);
  const value = parseInt(timeString.slice(0, -1));

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default: return 604800; // 7 দিন
  }
};

const accessTokenExpire = process.env.ACCESS_TOKEN_EXPIRE || "15m";
const refreshTokenExpire = process.env.REFRESH_TOKEN_EXPIRE || "3d";

export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + convertToSeconds(accessTokenExpire) * 1000),
  maxAge: convertToSeconds(accessTokenExpire) * 1000,
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
};

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + convertToSeconds(refreshTokenExpire) * 1000),
  maxAge: convertToSeconds(refreshTokenExpire) * 1000,
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
};
