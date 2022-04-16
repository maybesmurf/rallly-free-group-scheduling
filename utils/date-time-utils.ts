import { Option } from "@prisma/client";
import { format, isSameDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import spacetime from "spacetime";
import { OperationCanceledException } from "typescript";

import {
  DateTimeOption,
  TimeOption,
} from "../components/forms/poll-options-form";

export const getBrowserTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

export const encodeDateOption = (option: DateTimeOption) => {
  return option.type === "timeSlot"
    ? `${option.start}/${option.end}`
    : option.date;
};

export interface ParsedDateOption {
  type: "date";
  optionId: string;
  day: string;
  dow: string;
  month: string;
}

export interface ParsedTimeSlotOption {
  type: "timeSlot";
  optionId: string;
  day: string;
  dow: string;
  month: string;
  startTime: string;
  endTime: string;
}

export type ParsedDateTimeOpton = ParsedDateOption | ParsedTimeSlotOption;

const isTimeSlot = (value: string) => value.indexOf("/") !== -1;

export const decodeOptions = (
  options: Option[],
  timeZone: string | null,
  targetTimeZone: string,
):
  | { pollType: "date"; options: ParsedDateOption[] }
  | { pollType: "timeSlot"; options: ParsedTimeSlotOption[] } => {
  const pollType = isTimeSlot(options[0].value) ? "timeSlot" : "date";

  if (pollType === "timeSlot") {
    return {
      pollType,
      options: options.map((option) =>
        parseTimeSlotOption(option, timeZone, targetTimeZone),
      ),
    };
  } else {
    return {
      pollType,
      options: options.map((option) => parseDateOption(option)),
    };
  }
};

const parseDateOption = (option: Option): ParsedDateOption => {
  const dateString =
    option.value.indexOf("T") === -1
      ? // we add the time because otherwise Date will assume UTC time which might change the day for some time zones
        option.value + "T00:00:00"
      : option.value;
  const date = new Date(dateString);
  return {
    type: "date",
    optionId: option.id,
    day: format(date, "d"),
    dow: format(date, "E"),
    month: format(date, "MMM"),
  };
};

const parseTimeSlotOption = (
  option: Option,
  timeZone: string | null,
  targetTimeZone: string,
): ParsedTimeSlotOption => {
  const [start, end] = option.value.split("/");
  if (timeZone && targetTimeZone) {
    const startDate = spacetime(start, timeZone).toNativeDate();
    const endDate = spacetime(end, timeZone).toNativeDate();
    return {
      type: "timeSlot",
      optionId: option.id,
      startTime: formatInTimeZone(startDate, targetTimeZone, "hh:mm a"),
      endTime: formatInTimeZone(endDate, targetTimeZone, "hh:mm a"),
      day: formatInTimeZone(startDate, targetTimeZone, "d"),
      dow: formatInTimeZone(startDate, targetTimeZone, "E"),
      month: formatInTimeZone(startDate, targetTimeZone, "MMM"),
    };
  } else {
    const date = new Date(start);
    return {
      type: "timeSlot",
      optionId: option.id,
      startTime: format(date, "hh:mm a"),
      endTime: format(new Date(end), "hh:mm a"),
      day: format(date, "d"),
      dow: format(date, "E"),
      month: format(date, "MMM"),
    };
  }
};

export const decodeDateOption = (
  option: Option,
  timeZone: string | null,
  targetTimeZone: string,
): ParsedDateTimeOpton => {
  const isTimeRange = option.value.indexOf("/") !== -1;
  // option can either be an ISO date (ex. 2000-01-01)
  // or a time range (ex. 2000-01-01T08:00:00/2000-01-01T09:00:00)
  if (isTimeRange) {
    const [start, end] = option.value.split("/");

    if (timeZone && targetTimeZone) {
      const startDate = spacetime(start, timeZone).toNativeDate();
      const endDate = spacetime(end, timeZone).toNativeDate();
      return {
        type: "timeSlot",
        optionId: option.id,
        startTime: formatInTimeZone(startDate, targetTimeZone, "hh:mm a"),
        endTime: formatInTimeZone(endDate, targetTimeZone, "hh:mm a"),
        day: formatInTimeZone(startDate, targetTimeZone, "d"),
        dow: formatInTimeZone(startDate, targetTimeZone, "E"),
        month: formatInTimeZone(startDate, targetTimeZone, "MMM"),
      };
    } else {
      const date = new Date(start);
      return {
        type: "timeSlot",
        optionId: option.id,
        startTime: format(date, "hh:mm a"),
        endTime: format(new Date(end), "hh:mm a"),
        day: format(date, "d"),
        dow: format(date, "E"),
        month: format(date, "MMM"),
      };
    }
  }

  // we add the time because otherwise Date will assume UTC time which might change the day for some time zones
  const dateString =
    option.value.indexOf("T") === -1
      ? option.value + "T00:00:00"
      : option.value;
  const date = new Date(dateString);
  return {
    type: "date",
    optionId: option.id,
    day: format(date, "d"),
    dow: format(date, "E"),
    month: format(date, "MMM"),
  };
};

export const removeAllOptionsForDay = (
  options: DateTimeOption[],
  date: Date,
) => {
  return options.filter((option) => {
    const optionDate = spacetime(
      option.type === "date" ? option.date : option.start,
    ).toNativeDate();
    return !isSameDay(date, optionDate);
  });
};

export const getDateProps = (date: Date) => {
  return {
    day: format(date, "d"),
    dow: format(date, "E"),
    month: format(date, "MMM"),
  };
};

export const expectTimeOption = (d: DateTimeOption): TimeOption => {
  if (d.type === "date") {
    throw new Error("Expected timeSlot but got date instead");
  }
  return d;
};
