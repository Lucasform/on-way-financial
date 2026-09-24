-- Corrige buckets de storage da obra que ficaram privados por engano.
-- O frontend usa getPublicUrl() em obra-gallery e obra-documents, que só
-- retorna uma URL utilizável quando o bucket é público. As RLS policies
-- de write/delete continuam restringindo quem pode alterar os arquivos.
update storage.buckets set public = true where id in ('obra-gallery', 'obra-documents');
