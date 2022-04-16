import clsx from "clsx";
import { groupBy } from "lodash";
import { useTranslation } from "next-i18next";
import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { isOptionalTypeNode } from "typescript";
import { ParsedTimeSlotOption } from "utils/date-time-utils";

import { usePoll } from "@/components/poll-context";

import TimeRange from "../time-range";
import { ParticipantForm } from "../types";
import UserAvater from "../user-avatar";
import VoteIcon from "../vote-icon";

export interface TimeSlotOptionsProps {
  options: ParsedTimeSlotOption[];
  editable?: boolean;
  selectedParticipantId?: string;
}

const TimeSlotOptions: React.VoidFunctionComponent<TimeSlotOptionsProps> = ({
  options,
  editable,
  selectedParticipantId,
}) => {
  const highScore = -1;
  const { t } = useTranslation("app");
  const { register, setValue, watch, getValues, control } =
    useFormContext<ParticipantForm>();
  const { getVotesForOption, getVote, getParticipantById } = usePoll();
  const grouped = groupBy(options, (option) => {
    return `${option.dow} ${option.day} ${option.month}`;
  });
  const watchVotes = watch("votes");
  return (
    <div className="divide-y">
      {Object.entries(grouped).map(([day, options]) => {
        return (
          <div key={day}>
            <div className="sticky top-[97px] z-10 flex border-b bg-slate-50/80 py-2 px-4 text-sm font-semibold  shadow-sm backdrop-blur-md">
              <div className="grow">{day}</div>
              {editable ? (
                <div className="w-14 text-center">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={options.every((option) =>
                      watchVotes.includes(option.optionId),
                    )}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setValue("votes", [
                          ...getValues("votes"),
                          ...options.map(({ optionId }) => optionId),
                        ]);
                      } else {
                        setValue(
                          "votes",
                          getValues("votes").filter((optionId) =>
                            options.every(
                              (option) => option.optionId !== optionId,
                            ),
                          ),
                        );
                      }
                    }}
                  />
                </div>
              ) : null}
            </div>
            <div className="divide-y">
              {options.map((option) => {
                const votes = getVotesForOption(option.optionId);
                const numVotes = votes.length;
                return (
                  <div
                    key={option.optionId}
                    className="flex items-center space-x-4 py-2 px-4"
                  >
                    <div>
                      <TimeRange
                        startTime={option.startTime}
                        endTime={option.endTime}
                      />
                    </div>
                    <div className="grow items-center space-y-1">
                      <div>
                        <span
                          className={clsx(
                            "inline-block rounded-full border px-2 text-xs leading-relaxed",
                            {
                              "border-slate-200": numVotes !== highScore,
                              "border-rose-500 text-rose-500":
                                numVotes === highScore,
                            },
                          )}
                        >
                          {t("voteCount", { count: numVotes })}
                        </span>
                      </div>
                      {votes.length ? (
                        <div className="-space-x-1">
                          {votes
                            .slice(0, votes.length <= 6 ? 6 : 5)
                            .map((vote) => {
                              const participant = getParticipantById(
                                vote.participantId,
                              );
                              return (
                                <UserAvater
                                  key={vote.id}
                                  className="ring-1 ring-white"
                                  name={participant.name}
                                />
                              );
                            })}
                          {votes.length > 6 ? (
                            <span className="inline-flex h-5 items-center justify-center rounded-full bg-slate-100 px-1 text-xs font-medium ring-1 ring-white">
                              +{votes.length - 5}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-lg">
                      {editable ? (
                        <Controller
                          control={control}
                          name="votes"
                          render={({ field }) => {
                            const checked = field.value.includes(
                              option.optionId,
                            );
                            return (
                              <div
                                onClick={() => {
                                  if (field.value.includes(option.optionId)) {
                                    field.onChange(
                                      field.value.filter(
                                        (optionId) =>
                                          optionId !== option.optionId,
                                      ),
                                    );
                                  } else {
                                    field.onChange([
                                      ...field.value,
                                      option.optionId,
                                    ]);
                                  }
                                }}
                                className="absolute inset-0 flex h-full w-full items-center justify-center"
                              >
                                <input
                                  checked={checked}
                                  type="checkbox"
                                  className="checkbox"
                                  value={option.optionId}
                                  {...register("votes")}
                                />
                              </div>
                            );
                          }}
                        />
                      ) : selectedParticipantId ? (
                        <VoteIcon
                          type={getVote(selectedParticipantId, option.optionId)}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TimeSlotOptions;
