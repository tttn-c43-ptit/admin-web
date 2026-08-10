export function localToUtcCron(
  frequency: string,
  localTime: string,
  localDayOfWeek: string,
  localDayOfMonth: string
): string {
  const [hourStr, minStr] = localTime.split(":");
  const localHour = parseInt(hourStr, 10);
  const localMin = parseInt(minStr, 10);

  const d = new Date();
  d.setHours(localHour, localMin, 0, 0);

  const utcHour = d.getUTCHours();
  const utcMin = d.getUTCMinutes();

  let dayOffset = d.getUTCDay() - d.getDay();
  if (dayOffset < -1) dayOffset += 7;
  if (dayOffset > 1) dayOffset -= 7;

  if (frequency === "DAILY") {
    return `${utcMin} ${utcHour} * * *`;
  }

  if (frequency === "WEEKLY") {
    let dow = parseInt(localDayOfWeek, 10);
    dow = (dow + dayOffset) % 7;
    if (dow < 0) dow += 7;
    return `${utcMin} ${utcHour} * * ${dow}`;
  }

  if (frequency === "MONTHLY") {
    let dom = parseInt(localDayOfMonth, 10);
    dom = dom + dayOffset;
    if (dom < 1) dom = 1;
    if (dom > 31) dom = 31;
    return `${utcMin} ${utcHour} ${dom} * *`;
  }

  return "* * * * *";
}

export function utcToLocalCronString(cronExpr: string): string {
  const parts = cronExpr.split(" ");
  if (parts.length !== 5) return cronExpr;
  const [min, hour, dom, mon, dow] = parts;

  if (min === "*" || hour === "*") return cronExpr;

  const d = new Date();
  d.setUTCHours(parseInt(hour, 10), parseInt(min, 10), 0, 0);

  const localHour = d.getHours().toString().padStart(2, "0");
  const localMin = d.getMinutes().toString().padStart(2, "0");
  const time = `${localHour}:${localMin}`;

  let dayOffset = d.getDay() - d.getUTCDay();
  if (dayOffset < -1) dayOffset += 7;
  if (dayOffset > 1) dayOffset -= 7;

  if (dom === "*" && mon === "*" && dow === "*") {
    return `Hàng ngày lúc ${time}`;
  }

  if (dom === "*" && mon === "*" && dow !== "*") {
    let localDow = parseInt(dow, 10) + dayOffset;
    if (localDow < 0) localDow += 7;
    localDow = localDow % 7;
    const days = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    return `Hàng tuần (${days[localDow]}) lúc ${time}`;
  }

  if (dom !== "*" && mon === "*" && dow === "*") {
    let localDom = parseInt(dom, 10) + dayOffset;
    if (localDom < 1) localDom = 1;
    if (localDom > 31) localDom = 31;
    return `Hàng tháng (ngày ${localDom}) lúc ${time}`;
  }

  return cronExpr;
}

export function parseUtcCronToLocalForm(cronExpr: string): {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  time: string;
  dayOfWeek: string;
  dayOfMonth: string;
} {
  const parts = cronExpr.split(" ");
  if (parts.length !== 5)
    return { frequency: "DAILY", time: "08:00", dayOfWeek: "1", dayOfMonth: "1" };
  const [min, hour, dom, mon, dow] = parts;

  if (min === "*" || hour === "*")
    return { frequency: "DAILY", time: "08:00", dayOfWeek: "1", dayOfMonth: "1" };

  const d = new Date();
  d.setUTCHours(parseInt(hour, 10), parseInt(min, 10), 0, 0);

  const localHour = d.getHours().toString().padStart(2, "0");
  const localMin = d.getMinutes().toString().padStart(2, "0");
  const time = `${localHour}:${localMin}`;

  let dayOffset = d.getDay() - d.getUTCDay();
  if (dayOffset < -1) dayOffset += 7;
  if (dayOffset > 1) dayOffset -= 7;

  if (dom === "*" && mon === "*" && dow === "*") {
    return { frequency: "DAILY", time, dayOfWeek: "1", dayOfMonth: "1" };
  }

  if (dom === "*" && mon === "*" && dow !== "*") {
    let localDow = parseInt(dow, 10) + dayOffset;
    if (localDow < 0) localDow += 7;
    localDow = localDow % 7;
    return {
      frequency: "WEEKLY",
      time,
      dayOfWeek: localDow.toString(),
      dayOfMonth: "1",
    };
  }

  if (dom !== "*" && mon === "*" && dow === "*") {
    let localDom = parseInt(dom, 10) + dayOffset;
    if (localDom < 1) localDom = 1;
    if (localDom > 31) localDom = 31;
    return {
      frequency: "MONTHLY",
      time,
      dayOfWeek: "1",
      dayOfMonth: localDom.toString(),
    };
  }

  return { frequency: "DAILY", time: "08:00", dayOfWeek: "1", dayOfMonth: "1" };
}
