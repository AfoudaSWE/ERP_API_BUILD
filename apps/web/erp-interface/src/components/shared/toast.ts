export type ToastDetail={type:"success"|"error"|"info";message:string};
export function showToast(detail:ToastDetail){window.dispatchEvent(new CustomEvent<ToastDetail>("erp:toast",{detail}));}
