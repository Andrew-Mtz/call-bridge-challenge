export type TelnyxWebhook = {
  data: {
    event_type: string;
    payload: {
      call_control_id: string;
      call_leg_id?: string;
      connection_id?: string;
      direction?: "incoming" | "outgoing";
      client_state?: string;
      from?: string;
      to?: string;
    };
  };
};
