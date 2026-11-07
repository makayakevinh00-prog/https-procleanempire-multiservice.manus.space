-- Contrôle d'une base de TEST : ne doit renvoyer AUCUNE ligne (chaque ligne = une donnée suspecte).
select 'suppliers' as source, count(*)::text as detail from suppliers having count(*) > 0
union all select 'supplier_payments', count(*)::text from supplier_payments having count(*) > 0
union all select 'payments (Qonto)', count(*)::text from payments having count(*) > 0
union all select 'app_settings : IBAN/BIC/SIRET/téléphone renseignés', '1' from app_settings where company_iban is not null or company_bic is not null or company_siret is not null or company_phone is not null
union all select 'app_settings : e-mail non fictif', coalesce(company_email, '') from app_settings where coalesce(company_email, '') not like '%@example.invalid' or coalesce(notify_email, '') not like '%@example.invalid'
union all select 'clients : e-mail non fictif', email from clients where email is not null and email not like '%@example.invalid'
union all select 'staff : e-mail non fictif', email from staff where email is not null and email not like '%@example.invalid'
union all select 'quote_requests : e-mail non fictif', email from quote_requests where email is not null and email not like '%@example.invalid'
union all select 'client_emails : e-mail non fictif', email from client_emails where email not like '%@example.invalid'
union all select 'clients : nom réel connu', name from clients where name ~* '(sarb|sea soci|swyfo|geetha|youssfi|despic|pinon|concierg|easy ?stay|kabongo|zehe|rachadi|tawer|ile de france recyclage)'
union all select 'IBAN dans les notes ou conditions', 'FR76…' from app_settings where coalesce(quote_terms, '') ~* 'FR76';
