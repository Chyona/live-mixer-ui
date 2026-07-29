import { Navigate, useLocation, useParams } from 'react-router-dom';

import { LIVE_SLICE_PATH } from '~/routes/links';

/** 旧人工切片路由 → 统一切片页 */
const ManualRedirect = () => {
  const { id = '' } = useParams();
  const location = useLocation();
  const search = location.search || '';
  return <Navigate to={`${LIVE_SLICE_PATH}/${id}${search}`} replace state={location.state} />;
};

export default ManualRedirect;
