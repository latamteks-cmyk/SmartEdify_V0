export interface QueryCall<TParams extends readonly unknown[] | undefined = readonly unknown[] | undefined> {
  readonly text: string;
  readonly values?: TParams;
}

export interface QueryResult<TRecord = Record<string, unknown>> {
  readonly rows: TRecord[];
  readonly rowCount: number;
}

export type QueryHandler<TRecord = Record<string, unknown>> = (
  call: QueryCall
) => Promise<QueryResult<TRecord>> | QueryResult<TRecord>;

export interface PostgresMock<TRecord = Record<string, unknown>> {
  readonly query: (text: string, values?: readonly unknown[]) => Promise<QueryResult<TRecord>>;
  readonly setQueryHandler: (handler: QueryHandler<TRecord>) => void;
  readonly getCalls: () => readonly QueryCall[];
  readonly reset: () => void;
}

export function createPostgresMock<TRecord = Record<string, unknown>>(): PostgresMock<TRecord> {
  let handler: QueryHandler<TRecord> | undefined;
  const calls: QueryCall[] = [];

  const setQueryHandler = (nextHandler: QueryHandler<TRecord>) => {
    handler = nextHandler;
  };

  const reset = () => {
    handler = undefined;
    calls.splice(0, calls.length);
  };

  const query = async (text: string, values?: readonly unknown[]): Promise<QueryResult<TRecord>> => {
    const call: QueryCall = { text, values };
    calls.push(call);

    if (!handler) {
      return { rows: [], rowCount: 0 };
    }

    const result = await handler(call);
    return {
      rows: Array.isArray(result.rows) ? result.rows : [],
      rowCount: typeof result.rowCount === 'number' ? result.rowCount : result.rows.length
    };
  };

  const getCalls = () => calls.slice();

  return {
    query,
    setQueryHandler,
    getCalls,
    reset
  };
}
