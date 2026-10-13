/**
 * All text for the Help & Guide panel (the "?" icon in the top bar).
 * Edit here to change what users see — the panel just renders this list.
 *
 * Each section's `body` is a list of blocks: a plain string is a
 * paragraph, and { list: [...] } is a bulleted list.
 */

export type HelpBlock = string | { list: string[] };

export interface HelpSection {
  id: string;
  title: string;
  body: HelpBlock[];
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting started',
    body: [
      'CertiWatch keeps track of all your government certificates, licenses and compliance documents in one place, across every branch.',
      'It watches each expiry date for you and warns you in good time, so nothing expires by surprise. The Dashboard gives you a quick overview, and the Certificates page lists everything.',
    ],
  },
  {
    id: 'adding-a-certificate',
    title: 'Adding a certificate',
    body: [
      'Go to Certificates and click "New Certificate", then fill in:',
      {
        list: [
          'Certificate Name: what the certificate is, e.g. "Commercial Registration Certificate".',
          'Category: the type of certificate (License, Permit, Registration and so on).',
          'Reference Number: the official number printed on the certificate.',
          'Branch: which branch or office the certificate belongs to.',
          'Description / Purpose (optional): any notes about it.',
          'Issue Date and Expiry Date: entered as dd/mm/yyyy. The expiry date must be after the issue date.',
          'Alert me before expiry (days): how many days before the expiry date you want to start being reminded, e.g. 30.',
          'Document (optional): upload a scan or copy of the certificate as a PDF, JPG, JPEG or PNG file.',
        ],
      },
    ],
  },
  {
    id: 'how-alerts-work',
    title: 'How alerts work',
    body: [
      'Every certificate has its own alert window. It starts the number of "alert days before expiry" before the expiry date. For example, with 30 days and an expiry date of 31 December, the window starts on 1 December.',
      {
        list: [
          'On the day the window starts, the certificate\'s status changes to Expiring Soon and the first alert goes out.',
          'Alerts repeat every 7 days for as long as the certificate stays in its window.',
          'They keep going after the expiry date too, until the certificate is renewed.',
          'Alerts are sent by email (to everyone on the Alert Recipients page) and as in-app notifications (the bell icon and the Notifications page).',
        ],
      },
    ],
  },
  {
    id: 'status-meanings',
    title: 'Status meanings',
    body: [
      {
        list: [
          'Active: the certificate is valid and not yet inside its alert window.',
          'Expiring Soon: the certificate is inside its alert window. Plan the renewal now.',
          'Expired: the expiry date has been reached or passed. The certificate counts as expired on its expiry date itself.',
        ],
      },
      'You never set the status by hand. CertiWatch works it out from the expiry date and the alert days.',
    ],
  },
  {
    id: 'renewing',
    title: 'Renewing a certificate',
    body: [
      'Open the certificate and click "Renew". Enter the new expiry date, confirm (or change) the alert days for the new cycle, and optionally upload the new document.',
      {
        list: [
          'The certificate\'s expiry date is updated and its status is worked out again straight away.',
          'Alerts for the old expiry date stop, and a fresh alert cycle starts for the new date.',
          'The previous expiry date and document are kept in the renewal history, so nothing is lost.',
        ],
      },
    ],
  },
  {
    id: 'recipients-and-users',
    title: 'Managing alert recipients and users',
    body: [
      'Alert Recipients: this is the list of people who get alert emails. Add a name and email address (any email address works, including Gmail), switch someone off temporarily with the toggle, or remove them. In-app notifications are shared by everyone who logs in, so they need no list.',
      'Manage Users: this is where you give people access to CertiWatch. Add a name, email and temporary password, and deactivate someone to remove their access (you can reactivate them later). Everyone who can log in has the same access, and there is no public sign-up.',
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    body: [
      'The Reports page gives you:',
      {
        list: [
          'An overview of how many certificates are Active, Expiring Soon and Expired.',
          'A list of certificates expired in a chosen month and year.',
          'A chart of how many certificates expire in each month of a year.',
          'A breakdown by branch and by category.',
        ],
      },
      'Every report can be downloaded as a PDF or an Excel file using the buttons next to it.',
    ],
  },
  {
    id: 'need-more-help',
    title: 'Need more help?',
    body: [
      'If something isn\'t working as expected, or you have a question that isn\'t answered here, please get in touch with your CertiWatch administrator.',
    ],
  },
];
