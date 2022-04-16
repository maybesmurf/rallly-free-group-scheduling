import { Listbox } from "@headlessui/react";
import { Participant, Vote } from "@prisma/client";
import clsx from "clsx";
import { motion } from "framer-motion";
import { useTranslation } from "next-i18next";
import * as React from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";

import ChevronDown from "@/components/icons/chevron-down.svg";
import Pencil from "@/components/icons/pencil.svg";
import PlusCircle from "@/components/icons/plus-circle.svg";
import Trash from "@/components/icons/trash.svg";
import { usePoll } from "@/components/poll-context";

import { decodeDateOption } from "../../utils/date-time-utils";
import { requiredString } from "../../utils/form-validation";
import Button from "../button";
import DateCard from "../date-card";
import CheckCircle from "../icons/check-circle.svg";
import { styleMenuItem } from "../menu-styles";
import NameInput from "../name-input";
import TimeZonePicker from "../time-zone-picker";
import { useUserName } from "../user-name-context";
import DateOptions from "./mobile-poll/date-options";
import TimeSlotOptions from "./mobile-poll/time-slot-options";
import {
  useAddParticipantMutation,
  useUpdateParticipantMutation,
} from "./mutations";
import TimeRange from "./time-range";
import { ParticipantForm, PollProps } from "./types";
import { useDeleteParticipantModal } from "./use-delete-participant-modal";
import UserAvater from "./user-avatar";
import VoteIcon from "./vote-icon";

const MobilePoll: React.VoidFunctionComponent<PollProps> = ({
  pollId,
  highScore,
}) => {
  const pollContext = usePoll();

  const { poll, targetTimeZone, setTargetTimeZone } = pollContext;

  const { timeZone, options, participants, role } = poll;

  const [, setUserName] = useUserName();

  const participantById = participants.reduce<
    Record<string, Participant & { votes: Vote[] }>
  >((acc, curr) => {
    acc[curr.id] = { ...curr };
    return acc;
  }, {});

  const form = useForm<ParticipantForm>({
    defaultValues: {
      name: "",
      votes: [],
    },
  });

  const { register, setValue, reset, handleSubmit, control, formState } = form;
  const [selectedParticipantId, setSelectedParticipantId] =
    React.useState<string>();

  const selectedParticipant = selectedParticipantId
    ? participantById[selectedParticipantId]
    : undefined;

  const selectedParticipantVotedOption = selectedParticipant
    ? selectedParticipant.votes.map((vote) => vote.optionId)
    : undefined;

  const [mode, setMode] = React.useState<"edit" | "default">(() =>
    participants.length > 0 ? "default" : "edit",
  );

  const { t } = useTranslation("app");

  const { mutate: updateParticipantMutation } =
    useUpdateParticipantMutation(pollId);

  const { mutate: addParticipantMutation } = useAddParticipantMutation(pollId);
  const [deleteParticipantModal, confirmDeleteParticipant] =
    useDeleteParticipantModal(pollId, selectedParticipantId ?? ""); // TODO (Luke Vella) [2022-03-14]:  Figure out a better way to deal with these modals

  // This hack is necessary because when there is only one checkbox,
  // react-hook-form does not know to format the value into an array.
  // See: https://github.com/react-hook-form/react-hook-form/issues/7834
  const checkboxGroupHack = (
    <input type="checkbox" className="hidden" {...register("votes")} />
  );

  return (
    <FormProvider {...form}>
      <form
        className="border-t border-b bg-white shadow-sm"
        onSubmit={handleSubmit((data) => {
          return new Promise<ParticipantForm>((resolve, reject) => {
            if (selectedParticipant) {
              updateParticipantMutation(
                {
                  participantId: selectedParticipant.id,
                  pollId,
                  ...data,
                },
                {
                  onSuccess: () => {
                    setMode("default");
                    resolve(data);
                  },
                  onError: reject,
                },
              );
            } else {
              addParticipantMutation(data, {
                onSuccess: (newParticipant) => {
                  setMode("default");
                  setSelectedParticipantId(newParticipant.id);
                  resolve(data);
                },
                onError: reject,
              });
            }
          });
        })}
      >
        {checkboxGroupHack}
        <div className="sticky top-0 z-30 flex flex-col space-y-2 border-b bg-gray-50 px-4 py-2">
          {mode === "default" ? (
            <div className="flex space-x-3">
              <Listbox
                value={selectedParticipantId}
                onChange={setSelectedParticipantId}
              >
                <div className="menu grow">
                  <Listbox.Button className="btn-default w-full text-left">
                    <div className="grow">
                      {selectedParticipant ? (
                        <div className="flex items-center space-x-2">
                          <UserAvater name={selectedParticipant.name} />
                          <span>{selectedParticipant.name}</span>
                        </div>
                      ) : (
                        t("participantCount", { count: participants.length })
                      )}
                    </div>
                    <ChevronDown className="h-5" />
                  </Listbox.Button>
                  <Listbox.Options
                    as={motion.div}
                    transition={{
                      duration: 0.1,
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="menu-items max-h-72 w-full overflow-auto"
                  >
                    <Listbox.Option value={undefined} className={styleMenuItem}>
                      Show all
                    </Listbox.Option>
                    {participants.map((participant) => (
                      <Listbox.Option
                        key={participant.id}
                        value={participant.id}
                        className={styleMenuItem}
                      >
                        <div className="flex items-center space-x-2">
                          <UserAvater name={participant.name} />
                          <span>{participant.name}</span>
                        </div>
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
              {!poll.closed ? (
                selectedParticipant ? (
                  <div className="flex space-x-3">
                    <Button
                      icon={<Pencil />}
                      onClick={() => {
                        setMode("edit");
                        setValue("name", selectedParticipant.name);
                        setValue(
                          "votes",
                          selectedParticipant.votes.map(
                            (vote) => vote.optionId,
                          ),
                        );
                      }}
                    >
                      Edit
                    </Button>
                    {role === "admin" ? (
                      <Button
                        icon={<Trash />}
                        type="danger"
                        onClick={confirmDeleteParticipant}
                      />
                    ) : null}
                    {deleteParticipantModal}
                  </div>
                ) : (
                  <Button
                    type="primary"
                    icon={<PlusCircle />}
                    onClick={() => {
                      reset();
                      setUserName("");
                      setMode("edit");
                    }}
                  >
                    New
                  </Button>
                )
              ) : null}
            </div>
          ) : null}
          {mode === "edit" ? (
            <Controller
              name="name"
              control={control}
              rules={{ validate: requiredString }}
              render={({ field }) => (
                <NameInput
                  disabled={formState.isSubmitting}
                  autoFocus={!selectedParticipant}
                  className="w-full"
                  {...field}
                />
              )}
            />
          ) : null}
          {timeZone ? (
            <TimeZonePicker
              value={targetTimeZone}
              onChange={setTargetTimeZone}
            />
          ) : null}
        </div>
        {(() => {
          switch (pollContext.pollType) {
            case "date":
              return (
                <DateOptions
                  selectedParticipantId={selectedParticipantId}
                  options={pollContext.options}
                  editable={mode === "edit"}
                />
              );
            case "timeSlot":
              return (
                <TimeSlotOptions
                  selectedParticipantId={selectedParticipantId}
                  options={pollContext.options}
                  editable={mode === "edit"}
                />
              );
          }
        })()}
        {mode === "edit" ? (
          <div className="flex space-x-3 border-t p-2">
            <Button className="grow" onClick={() => setMode("default")}>
              Cancel
            </Button>
            <Button
              icon={<CheckCircle />}
              htmlType="submit"
              className="grow"
              type="primary"
              loading={formState.isSubmitting}
            >
              Save
            </Button>
          </div>
        ) : null}
      </form>
    </FormProvider>
  );
};

export default MobilePoll;
