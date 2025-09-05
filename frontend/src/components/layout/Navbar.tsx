import React, { Fragment, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import { 
  HomeIcon, 
  ShoppingBagIcon, 
  BriefcaseIcon, 
  PlusIcon,
  UserIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  StarIcon,
  CreditCardIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { usePortalPreferences } from '../../hooks/usePortalPreferences';
import { useCredits } from '../../hooks/useCredits';
import clsx from 'clsx';

const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { preferences } = usePortalPreferences();
  const { balance } = useCredits();

  const baseNavigation = [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'Stories', href: '/stories', icon: PlusIcon },
    { name: 'Shorts', href: '/shorts', icon: PlusIcon },
  ];

  const conditionalNavigation = [
    ...(preferences.enable_job_portal ? [{ name: 'Jobs', href: '/jobs', icon: BriefcaseIcon }] : []),
    ...(preferences.enable_shop_portal ? [{ name: 'Shop', href: '/shop', icon: ShoppingBagIcon }] : []),
  ];

  const navigation = [...baseNavigation, ...conditionalNavigation];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 w-full bg-white shadow-sm border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary-600">
              SocialMedia
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'navbar-link flex items-center space-x-1',
                    location.pathname === item.href && 'active'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Create Post Button */}
            <Link
              to="/create-post"
              className="btn btn-primary flex items-center space-x-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:block">Create</span>
            </Link>

            {/* Credit Balance */}
            <Link 
              to="/credits/add"
              className="flex items-center space-x-2 px-3 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg text-sm font-medium transition-colors"
              title="Add Credits"
            >
              <CreditCardIcon className="h-4 w-4" />
              <span className="hidden sm:block">{balance.toLocaleString()}</span>
              <span className="sm:hidden">{balance > 999 ? '999+' : balance}</span>
            </Link>

            {/* Premium Badge */}
            {user?.is_premium && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-full text-xs font-medium">
                <StarIcon className="h-4 w-4" />
                <span>Premium</span>
              </div>
            )}

            {/* User Menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100">
                {user?.profile?.avatar ? (
                  <img
                    src={user.profile.avatar}
                    alt={user.username}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <UserIcon className="h-5 w-5 text-primary-600" />
                  </div>
                )}
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {user?.first_name || user?.username}
                </span>
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-200"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/profile"
                          className={clsx(
                            'flex items-center px-4 py-2 text-sm',
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                          )}
                        >
                          <UserIcon className="h-4 w-4 mr-3" />
                          Profile
                        </Link>
                      )}
                    </Menu.Item>
                    
                    {preferences.enable_shop_portal && (
                      <>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/shops"
                              className={clsx(
                                'flex items-center px-4 py-2 text-sm',
                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                              )}
                            >
                              <BuildingStorefrontIcon className="h-4 w-4 mr-3" />
                              My Shops
                            </Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link
                              to="/orders"
                              className={clsx(
                                'flex items-center px-4 py-2 text-sm',
                                active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                              )}
                            >
                              <ShoppingBagIcon className="h-4 w-4 mr-3" />
                              Orders
                            </Link>
                          )}
                        </Menu.Item>
                      </>
                    )}

                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to="/settings"
                          className={clsx(
                            'flex items-center px-4 py-2 text-sm',
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                          )}
                        >
                          <CogIcon className="h-4 w-4 mr-3" />
                          Settings
                        </Link>
                      )}
                    </Menu.Item>

                    {!user?.is_premium && (
                      <Menu.Item>
                        {({ active }) => (
                          <Link
                            to="/premium"
                            className={clsx(
                              'flex items-center px-4 py-2 text-sm',
                              active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                            )}
                          >
                            <StarIcon className="h-4 w-4 mr-3" />
                            Go Premium
                          </Link>
                        )}
                      </Menu.Item>
                    )}

                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={handleLogout}
                          className={clsx(
                            'flex items-center w-full px-4 py-2 text-sm',
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                          )}
                        >
                          <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                          Sign out
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;