import React, { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Stack } from '@mui/material';

import Loader from './components/loader';
import AdminPage from './feature/admin-page';
import CreatePost from './feature/create-post';
import HomePage from './feature/home';
import Login from './feature/login';
import Register from './feature/login/register';
import PostPage from './feature/post-page';
import { ROUTES } from './helpers/routes';
import SocketConnection from './helpers/sockets';
import { logoutAction, useAppDispatch } from './store';
import { getAccessToken, getUser, removeAccessToken } from './store/auth';

const App = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const dispatch = useAppDispatch();

	const { isLoadingUser, user } = useSelector((state) => state.auth);
	const redirectWithMessage = useRef(false);

	const loadUser = useCallback(
		async (cred) => {
			dispatch(getUser(cred));
		},
		[dispatch],
	);

	useEffect(() => {
		const cred = getAccessToken();

		if (cred) {
			loadUser(cred);
		}
	}, [loadUser]);

	useEffect(() => {
		if (!user) {
			return;
		}
		SocketConnection.connect(user);
		return () => {
			SocketConnection.close();
		};
	}, [user]);

	useEffect(() => {
		const logout = async ({ detail }) => {
			const withMessage = detail?.withLogoutMessage;
			const isToken = getAccessToken();
			if (withMessage !== undefined) {
				redirectWithMessage.current = withMessage;
			}
			if (!isToken) {
				redirectWithMessage.current = false;
			}
			removeAccessToken();
			dispatch(logoutAction());
			navigate('/login', { state: { from: location.pathname, withLogoutMessage: redirectWithMessage.current } });
		};
		window.addEventListener('logout', logout);
		return () => window.removeEventListener('logout', logout);
	}, [dispatch, location.pathname, navigate]);

	const protectedRoutes = () => {
		if (!getAccessToken()) {
			return null;
		}
		redirectWithMessage.current = true;

		return (
			<>
				<Route path={ROUTES.HOME} element={<HomePage />} />
				<Route path={ROUTES.NEW_POST} element={<CreatePost />} />
				<Route path="post/:postId" element={<PostPage />} />
				<Route path={ROUTES.ADMIN_PAGE} element={<AdminPage />} />

				<Route path="*" element={<Navigate to={ROUTES.HOME} />} />
			</>
		);
	};

	return (
		<>
			<Routes>
				<Route path={ROUTES.LOGIN} element={<Login />} />
				<Route path={ROUTES.REGISTER} element={<Register />} />

				<Route
					path="*"
					element={
						<Navigate
							to={ROUTES.LOGIN}
							state={{ from: location.pathname, withLogoutMessage: redirectWithMessage.current }}
						/>
					}
				/>
				{protectedRoutes()}
			</Routes>
			{isLoadingUser && (
				<Stack sx={{ width: '100vw', height: '100vh', position: 'fixed' }}>
					<Loader />
				</Stack>
			)}
		</>
	);
};

export default App;
