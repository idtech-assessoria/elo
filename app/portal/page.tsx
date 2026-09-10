import {requireUser} from '../../server/auth';
import Portal from './portal';
export const dynamic='force-dynamic';
export default async function Page(){await requireUser('/portal');return <Portal/>}
