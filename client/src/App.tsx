import React, { useState, useEffect } from 'react';
import { LoginView } from './components/auth/LoginView';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardView } from './components/dashboard/DashboardView';
import { PosCheckoutView } from './components/pos/PosCheckoutView';
import { ProductsView } from './components/products/ProductsView';
import { CategoryManager } from './components/products/CategoryManager';
import { PurchaseEntryView } from './components/purchases/PurchaseEntryView';
import { CustomersView } from './components/customers/CustomersView';
import { UsersView } from './components/users/UsersView';
import { CashAuditView } from './components/reports/CashAuditView';
import { DailySalesView } from './components/reports/DailySalesView';
import { BusinessSettingsView } from './components/business/BusinessSettingsView';
import { MobileScannerView } from './components/scanner/MobileScannerView';
import { QuotesView } from './components/quotes/QuotesView';
import { User, CurrencyRates, AppModule, BusinessInfo } from './types';

const DEFAULT_BUSINESS_INFO: BusinessInfo = {
  name: 'FLORECER REGALOS PERSONALIZADOS',
  legalName: 'Florecer Papelería Creativa S.A.',
  ruc: '80100254-0',
  phone: '+595 993 346 854',
  email: 'florecerpersonalizadoscde@gmail.com',
  address: 'Avda. Tte. Rojas Silva c/ Patricio Colman',
  city: 'Ciudad del Este - Paraguay',
  ticketFooterMessage: '¡Gracias por su preferencia! Diseños y regalos personalizados hechos con amor.',
  logoUrl: '',
  facebook: 'Florecer Personalizados',
  instagram: 'florecerpersonalizadoscde',
  quoteIntro: 'Por medio de la presente, me dirijo a usted de la manera más atenta y respetuosa, para hacerle llegar nuestro presupuesto actualizado',
  quoteDefaultValidityDays: 8,
  quoteDefaultPaymentTerms: '50% AL CONFIRMAR Y AL FINALIZAR EL TRABAJO 50% RESTANTE',
  quoteDefaultDeliveryTerms: '3 DÍAS HÁBILES'
};

export function App() {
  // Detección de sesión de escáner móvil por parámetro URL o hash
  const [mobileScannerSession, setMobileScannerSession] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get('scannerSession');
    if (session) return session;
    if (window.location.hash.startsWith('#scanner')) {
      const hashParams = new URLSearchParams(window.location.hash.replace('#scanner?', ''));
      return hashParams.get('session') || '';
    }
    return null;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeModule, setActiveModule] = useState<AppModule>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Datos de la empresa para el membrete de tickets y presupuestos (persistidos en localStorage)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>(() => {
    const saved = localStorage.getItem('regalos_business_info') || localStorage.getItem('boutique_business_info');
    if (saved) {
      try {
        return { ...DEFAULT_BUSINESS_INFO, ...JSON.parse(saved) };
      } catch (e) {
        console.error('Error al cargar datos de empresa guardados', e);
      }
    }
    return DEFAULT_BUSINESS_INFO;
  });

  // Cotizaciones globales (Paraguay frontera: R$ y US$ a Gs.)
  const [rates, setRates] = useState<CurrencyRates>({
    BRL_TO_GS: 1350,
    USD_TO_GS: 7550
  });

  // Manejo de clase dark en <html>
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleUpdateRates = (brl: number, usd: number) => {
    setRates({
      BRL_TO_GS: brl,
      USD_TO_GS: usd
    });
  };

  const handleSaveBusinessInfo = (newInfo: BusinessInfo) => {
    setBusinessInfo(newInfo);
    localStorage.setItem('regalos_business_info', JSON.stringify(newInfo));
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'VENDEDOR') {
      setActiveModule('pos');
    } else {
      setActiveModule('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Si se abrió desde un celular para actuar como lector de código de barras
  if (mobileScannerSession !== null) {
    return (
      <MobileScannerView
        initialSessionId={mobileScannerSession}
        onExit={() => {
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          setMobileScannerSession(null);
        }}
      />
    );
  }

  // Si no ha iniciado sesión, mostrar la pantalla de Login moderna
  if (!currentUser) {
    return (
      <LoginView
        onLogin={handleLogin}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />
    );
  }

  return (
    <AppLayout
      currentUser={currentUser}
      onLogout={handleLogout}
      activeModule={activeModule}
      setActiveModule={setActiveModule}
      isDarkMode={isDarkMode}
      setIsDarkMode={setIsDarkMode}
      rates={rates}
      onUpdateRates={handleUpdateRates}
      businessInfo={businessInfo}
    >
      {activeModule === 'dashboard' && (
        <DashboardView
          currentUser={currentUser}
          rates={rates}
          onNavigate={setActiveModule}
        />
      )}

      {activeModule === 'quotes' && (
        <QuotesView
          businessInfo={businessInfo}
        />
      )}

      {activeModule === 'pos' && (
        <PosCheckoutView
          rates={rates}
          businessInfo={businessInfo}
        />
      )}

      {activeModule === 'products' && (
        <ProductsView />
      )}

      {activeModule === 'categories' && (
        <CategoryManager />
      )}

      {activeModule === 'purchases' && (
        <PurchaseEntryView
          rates={rates}
        />
      )}

      {activeModule === 'customers' && (
        <CustomersView
          rates={rates}
        />
      )}

      {activeModule === 'users' && (
        <UsersView
          currentUser={currentUser}
        />
      )}

      {activeModule === 'audit' && (
        <CashAuditView
          rates={rates}
        />
      )}

      {activeModule === 'daily-sales' && (
        <DailySalesView
          rates={rates}
        />
      )}

      {activeModule === 'business' && (
        <BusinessSettingsView
          businessInfo={businessInfo}
          onSaveBusinessInfo={handleSaveBusinessInfo}
        />
      )}
    </AppLayout>
  );
}

export default App;
