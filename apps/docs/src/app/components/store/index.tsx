import { Batch } from './batch';
import { Dispatch } from './dispatch';
import { Get } from './get';
import { Setup } from './setup';
import { Use } from './use';

export function StoreDocs() {
  return (
    <>
      <Setup />
      <Get />
      <Use />
      <Dispatch />
      <Batch />
    </>
  );
}
