export const DRIVE_MASTER_FOLDER_ID = '1L6WrnOjq1ui19SQrzWvSqe5rLHKC-b60';

const ids = [
  '1gXyC8j_rCLW9nkTtdD9KqigLCDDcwUn3','1ykOG3L0hz7DB_Jm7XGz21W-ZRWFaFQtW','1C3lYNhyYo-l4bDVJlvIkBf0SPAlSC5Ft','1nlj2YxVRJnDoYhBrrJpVtePAcDzXC9Um',
  '1HphiCtUOsYCI4JU7rH84L3zusRYpDyH9','1ibsJKAT2BVpd5aThJOeKmd13CO_aNU3H','1ivoNE50J4r05a2X-T8KF-usgXyJQ_9A2','1m2obdUjnBmCtww4o9UC7knktN9GZLPF9',
  '1KrQazjvnay2O086LCQTatgOSD2ObrjwD','14fjBjCthnkNLjVhZf5k87RQ4M2--OIH3','19iPB4qIzk8z_t-iuY3yN_47-YqJgE3JI','1kKSb3Jca4P0LQd5ivBtYlIQBRYdmUK5x',
  '1QovfKZn3tENVvjw3EBAJQWfT-LZeAtKd','1n15cSXdkx8Ph2Sof4ulXYciRKDOTrXmA','1q0NEN3w26-KblWrKX3n4Y9_R8n52k-oF','1fj9-AA3PiiDcHBXaF16j-JC6AIkteAWs',
  '1hBjUq5BxbrG_5tBc58ET2UFeRcXVdGI9','1maw09tvoPmZDp0D9Jav6NpkbKOsYWAN3','1HyXeripQBrX0RjFKHzf0ZCZ435vWw_dD','12hJl_ebkU3kNpbU_pM3BverHKnqpl_Qf',
  '1ikAOyLfGDb5vH3n_BSTP33zAn5bayMMu','1wcifIIY9_HyQ_QkRk2ZHZhCmOxdnLjZB','1CalKJYyrd0ozND-NIFsAFRUrDT62tGej','1fHoCqJaRwZhEcqyGpTjCSNKfOtafA9Au',
];

export const driveTemplates = ids.map((id, index) => ({
  anexo: index + 1,
  id,
  nombre: `ACTIVIDADES CONTRATADAS #${index + 1}`,
  url: `https://drive.google.com/file/d/${id}/view`,
}));

export function driveTemplate(anexo: number) {
  return driveTemplates.find((item) => item.anexo === anexo);
}
