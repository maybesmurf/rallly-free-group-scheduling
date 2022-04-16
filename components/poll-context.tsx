import { Participant, Vote } from "@prisma/client";
import { GetPollResponse } from "api-client/get-poll";
import React from "react";
import {
  decodeOptions,
  getBrowserTimeZone,
  ParsedDateOption,
  ParsedTimeSlotOption,
} from "utils/date-time-utils";

import { useRequiredContext } from "./use-required-context";

type VoteType = "yes" | "no";

type PollContextValue = {
  poll: GetPollResponse;
  targetTimeZone: string;
  setTargetTimeZone: (timeZone: string) => void;
  pollType: "date" | "timeSlot";
  getVotesForOption: (optionId: string) => Vote[]; // maybe just attach votes to parsed options
  getParticipantById: (
    participantId: string,
  ) => Participant & { votes: Vote[] };
  getVote: (participantId: string, optionId: string) => VoteType;
} & (
  | { pollType: "date"; options: ParsedDateOption[] }
  | { pollType: "timeSlot"; options: ParsedTimeSlotOption[] }
);

export const PollContext = React.createContext<PollContextValue | null>(null);

PollContext.displayName = "PollContext.Provider";

export const usePoll = () => {
  const context = useRequiredContext(PollContext);
  return context;
};

export const PollContextProvider: React.VoidFunctionComponent<{
  value: GetPollResponse;
  children?: React.ReactNode;
}> = ({ value: poll, children }) => {
  const [targetTimeZone, setTargetTimeZone] =
    React.useState(getBrowserTimeZone);

  const contextValue = React.useMemo<PollContextValue>(() => {
    const parsedOptions = decodeOptions(
      poll.options,
      poll.timeZone,
      targetTimeZone,
    );
    const getParticipantById = (participantId: string) => {
      // TODO (Luke Vella) [2022-04-16]: Build an index instead
      const participant = poll.participants.find(
        ({ id }) => id === participantId,
      );

      if (!participant) {
        throw new Error(`Could not find participant with id: ${participantId}`);
      }

      return participant;
    };

    return {
      poll,
      getVotesForOption: (optionId: string) => {
        // TODO (Luke Vella) [2022-04-16]: Build an index instead
        const option = poll.options.find(({ id }) => id === optionId);
        return option?.votes ?? [];
      },
      getParticipantById,
      getVote: (participantId, optionId) => {
        return getParticipantById(participantId).votes.some(
          (vote) => vote.optionId === optionId,
        )
          ? "yes"
          : "no";
      },
      ...parsedOptions,
      targetTimeZone,
      setTargetTimeZone,
    };
  }, [poll, targetTimeZone]);
  return (
    <PollContext.Provider value={contextValue}>{children}</PollContext.Provider>
  );
};
