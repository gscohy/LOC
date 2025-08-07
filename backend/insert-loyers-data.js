import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Données des loyers à insérer
const loyersData = `cmdt7u5fe00ypyuxg79es7h6s	cmdt7u5f300yjyuxgine1hlcv	12	2012	0	0	PAYE	1,35699E+12	Loyer prorata 25/12/2012 - 31/12/2012	1,75408E+12	1,75408E+12
cmdt7u5ff00yryuxgx9qmh2jz	cmdt7u5f300yjyuxgine1hlcv	1	2013	300,00	300,00 €	PAYE	1,35699E+12	Loyer janvier 2013	1,75408E+12	1,75408E+12
cmdt7u5fg00ytyuxgyhdxxkfk	cmdt7u5f300yjyuxgine1hlcv	2	2013	300,00 €	300,00 €	PAYE	1,35967E+12	Loyer février 2013	1,75408E+12	1,75408E+12
cmdt7u5fg00yvyuxg3kssscx1	cmdt7u5f300yjyuxgine1hlcv	3	2013	300,00 €	300,00 €	PAYE	1,36209E+12	Loyer mars 2013	1,75408E+12	1,75408E+12
cmdt7u5fh00yxyuxg3y9e37jk	cmdt7u5f300yjyuxgine1hlcv	4	2013	300,00 €	300,00 €	PAYE	1,36477E+12	Loyer avril 2013	1,75408E+12	1,75408E+12
cmdt7u5fi00yzyuxgmpu0rtkn	cmdt7u5f300yjyuxgine1hlcv	5	2013	300,00 €	300,00 €	PAYE	1,36736E+12	Loyer mai 2013	1,75408E+12	1,75408E+12
cmdt7u5fj00z1yuxghnl9e1jo	cmdt7u5f300yjyuxgine1hlcv	6	2013	300,00 €	300,00 €	PAYE	1,37004E+12	Loyer juin 2013	1,75408E+12	1,75408E+12
cmdt7u5fj00z3yuxgjzqg6z0v	cmdt7u5f300yjyuxgine1hlcv	7	2013	300,00 €	300,00 €	PAYE	1,37263E+12	Loyer juillet 2013	1,75408E+12	1,75408E+12
cmdt7u5fk00z5yuxgadg19a0r	cmdt7u5f300yjyuxgine1hlcv	8	2013	300,00 €	300,00 €	PAYE	1,37531E+12	Loyer août 2013	1,75408E+12	1,75408E+12
cmdt7u5fl00z7yuxgrjumfzfi	cmdt7u5f300yjyuxgine1hlcv	9	2013	300,00 €	300,00 €	PAYE	1,37799E+12	Loyer septembre 2013	1,75408E+12	1,75408E+12
cmdt7u5fl00z9yuxgxeag5clz	cmdt7u5f300yjyuxgine1hlcv	10	2013	300,00 €	300,00 €	PAYE	1,38058E+12	Loyer octobre 2013	1,75408E+12	1,75408E+12
cmdt7u5fm00zbyuxg258cvdkn	cmdt7u5f300yjyuxgine1hlcv	11	2013	300,00 €	300,00 €	PAYE	1,38326E+12	Loyer novembre 2013	1,75408E+12	1,75408E+12
cmdt7u5fn00zdyuxgaoo2ira2	cmdt7u5f300yjyuxgine1hlcv	12	2013	300,00 €	300,00 €	PAYE	1,38585E+12	Loyer décembre 2013	1,75408E+12	1,75408E+12
cmdt7u5fn00zfyuxg9y4zk75o	cmdt7u5f300yjyuxgine1hlcv	1	2014	300,00 €	300,00 €	PAYE	1,38853E+12	Loyer janvier 2014	1,75408E+12	1,75408E+12
cmdt7u5fo00zhyuxg5jqywwqf	cmdt7u5f300yjyuxgine1hlcv	2	2014	300,00 €	300,00 €	PAYE	1,39121E+12	Loyer février 2014	1,75408E+12	1,75408E+12
cmdt7u5fp00zjyuxgoisx4o9k	cmdt7u5f300yjyuxgine1hlcv	3	2014	300,00 €	300,00 €	PAYE	1,39363E+12	Loyer mars 2014	1,75408E+12	1,75408E+12
cmdt7u5fp00zlyuxgn5kijnqv	cmdt7u5f300yjyuxgine1hlcv	4	2014	300,00 €	300,00 €	PAYE	1,3963E+12	Loyer avril 2014	1,75408E+12	1,75408E+12
cmdt7u5fq00znyuxgaxxabvnx	cmdt7u5f300yjyuxgine1hlcv	5	2014	300,00 €	300,00 €	PAYE	1,3989E+12	Loyer mai 2014	1,75408E+12	1,75408E+12
cmdt7u5fq00zpyuxgcf6w6gp2	cmdt7u5f300yjyuxgine1hlcv	6	2014	300,00 €	300,00 €	PAYE	1,40157E+12	Loyer juin 2014	1,75408E+12	1,75408E+12
cmdt7u5fr00zryuxgnv0g1i6a	cmdt7u5f300yjyuxgine1hlcv	7	2014	300,00 €	300,00 €	PAYE	1,40417E+12	Loyer juillet 2014	1,75408E+12	1,75408E+12
cmdt7u5fr00ztyuxgr1gzfb66	cmdt7u5f300yjyuxgine1hlcv	8	2014	300,00 €	300,00 €	PAYE	1,40684E+12	Loyer août 2014	1,75408E+12	1,75408E+12
cmdt7u5fs00zvyuxg59taicle	cmdt7u5f300yjyuxgine1hlcv	9	2014	300,00 €	300,00 €	PAYE	1,40952E+12	Loyer septembre 2014	1,75408E+12	1,75408E+12
cmdt7u5ft00zxyuxgkgdjv50m	cmdt7u5f300yjyuxgine1hlcv	10	2014	300,00 €	300,00 €	PAYE	1,41211E+12	Loyer octobre 2014	1,75408E+12	1,75408E+12
cmdt7u5ft00zzyuxgzkkjq4m8	cmdt7u5f300yjyuxgine1hlcv	11	2014	300,00 €	300,00 €	PAYE	1,4148E+12	Loyer novembre 2014	1,75408E+12	1,75408E+12
cmdt7u5fu0101yuxgkhkeokek	cmdt7u5f300yjyuxgine1hlcv	12	2014	300,00 €	300,00 €	PAYE	1,41739E+12	Loyer décembre 2014	1,75408E+12	1,75408E+12
cmdt7u5fv0103yuxg2gzqqlbo	cmdt7u5f300yjyuxgine1hlcv	1	2015	300,00 €	300,00 €	PAYE	1,42007E+12	Loyer janvier 2015	1,75408E+12	1,75408E+12
cmdt7u5fv0105yuxgx2eirn3n	cmdt7u5f300yjyuxgine1hlcv	2	2015	300,00 €	300,00 €	PAYE	1,42275E+12	Loyer février 2015	1,75408E+12	1,75408E+12
cmdt7u5fw0107yuxgz2girgmo	cmdt7u5f300yjyuxgine1hlcv	3	2015	300,00 €	300,00 €	PAYE	1,42516E+12	Loyer mars 2015	1,75408E+12	1,75408E+12
cmdt7u5fw0109yuxgpg3lvwbw	cmdt7u5f300yjyuxgine1hlcv	4	2015	300,00 €	300,00 €	PAYE	1,42784E+12	Loyer avril 2015	1,75408E+12	1,75408E+12
cmdt7u5fx010byuxgyniafb3s	cmdt7u5f300yjyuxgine1hlcv	5	2015	300,00 €	300,00 €	PAYE	1,43043E+12	Loyer mai 2015	1,75408E+12	1,75408E+12
cmdt7u5fy010dyuxgu5gkm2ar	cmdt7u5f300yjyuxgine1hlcv	6	2015	300,00 €	300,00 €	PAYE	1,43311E+12	Loyer juin 2015	1,75408E+12	1,75408E+12
cmdt7u5fy010fyuxgonjbqerd	cmdt7u5f300yjyuxgine1hlcv	7	2015	300,00 €	300,00 €	PAYE	1,4357E+12	Loyer juillet 2015	1,75408E+12	1,75408E+12
cmdt7u5fz010hyuxgp3rr6d17	cmdt7u5f300yjyuxgine1hlcv	8	2015	300,00 €	300,00 €	PAYE	1,43838E+12	Loyer août 2015	1,75408E+12	1,75408E+12
cmdt7u5fz010jyuxgmed3u5xs	cmdt7u5f300yjyuxgine1hlcv	9	2015	300,00 €	300,00 €	PAYE	1,44106E+12	Loyer septembre 2015	1,75408E+12	1,75408E+12
cmdt7u5g0010lyuxg4bn6cdet	cmdt7u5f300yjyuxgine1hlcv	10	2015	300,00 €	300,00 €	PAYE	1,44365E+12	Loyer octobre 2015	1,75408E+12	1,75408E+12
cmdt7u5g1010nyuxgc4f7jzab	cmdt7u5f300yjyuxgine1hlcv	11	2015	300,00 €	300,00 €	PAYE	1,44633E+12	Loyer novembre 2015	1,75408E+12	1,75408E+12
cmdt7u5g1010pyuxg8rii4aeh	cmdt7u5f300yjyuxgine1hlcv	12	2015	300,00 €	300,00 €	PAYE	1,44892E+12	Loyer décembre 2015	1,75408E+12	1,75408E+12
cmdt7u5g2010ryuxg4fdapr2j	cmdt7u5f300yjyuxgine1hlcv	1	2016	300,00 €	300,00 €	PAYE	1,4516E+12	Loyer janvier 2016	1,75408E+12	1,75408E+12
cmdt7u5g3010tyuxgn0r02fe3	cmdt7u5f300yjyuxgine1hlcv	2	2016	300,00 €	300,00 €	PAYE	1,45428E+12	Loyer février 2016	1,75408E+12	1,75408E+12
cmdt7u5g4010vyuxgd3unqslq	cmdt7u5f300yjyuxgine1hlcv	3	2016	300,00 €	300,00 €	PAYE	1,45679E+12	Loyer mars 2016	1,75408E+12	1,75408E+12
cmdt7u5g4010xyuxgo2jkvd5j	cmdt7u5f300yjyuxgine1hlcv	4	2016	300,00 €	300,00 €	PAYE	1,45946E+12	Loyer avril 2016	1,75408E+12	1,75408E+12
cmdt7u5g5010zyuxgukv2zwdt	cmdt7u5f300yjyuxgine1hlcv	5	2016	300,00 €	300,00 €	PAYE	1,46205E+12	Loyer mai 2016	1,75408E+12	1,75408E+12
cmdt7u5g60111yuxg0j9b021y	cmdt7u5f300yjyuxgine1hlcv	6	2016	300,00 €	300,00 €	PAYE	1,46473E+12	Loyer juin 2016	1,75408E+12	1,75408E+12
cmdt7u5g60113yuxgik6rcshr	cmdt7u5f300yjyuxgine1hlcv	7	2016	300,00 €	300,00 €	PAYE	1,46732E+12	Loyer juillet 2016	1,75408E+12	1,75408E+12
cmdt7u5g70115yuxg3qhstttt	cmdt7u5f300yjyuxgine1hlcv	8	2016	300,00 €	300,00 €	PAYE	1,47E+12	Loyer août 2016	1,75408E+12	1,75408E+12
cmdt7u5g80117yuxglbyt49i7	cmdt7u5f300yjyuxgine1hlcv	9	2016	300,00 €	300,00 €	PAYE	1,47268E+12	Loyer septembre 2016	1,75408E+12	1,75408E+12
cmdt7u5g80119yuxgrhsl1t49	cmdt7u5f300yjyuxgine1hlcv	10	2016	300,00 €	300,00 €	PAYE	1,47527E+12	Loyer octobre 2016	1,75408E+12	1,75408E+12
cmdt7u5g9011byuxgqx1ej4i6	cmdt7u5f300yjyuxgine1hlcv	11	2016	300,00 €	300,00 €	PAYE	1,47795E+12	Loyer novembre 2016	1,75408E+12	1,75408E+12
cmdt7u5ga011dyuxgz22mpe9s	cmdt7u5f300yjyuxgine1hlcv	12	2016	300,00 €	300,00 €	PAYE	1,48055E+12	Loyer décembre 2016	1,75408E+12	1,75408E+12
cmdt7u5ga011fyuxgi8jjxj6m	cmdt7u5f300yjyuxgine1hlcv	1	2017	300,00 €	300,00 €	PAYE	1,48323E+12	Loyer janvier 2017	1,75408E+12	1,75408E+12
cmdt7u5gb011hyuxgren4k65b	cmdt7u5f300yjyuxgine1hlcv	2	2017	300,00 €	300,00 €	PAYE	1,4859E+12	Loyer février 2017	1,75408E+12	1,75408E+12
cmdt7u5gc011jyuxgvml1jin2	cmdt7u5f300yjyuxgine1hlcv	3	2017	300,00 €	300,00 €	PAYE	1,48832E+12	Loyer mars 2017	1,75408E+12	1,75408E+12
cmdt7u5gc011lyuxgvbvwu4y4	cmdt7u5f300yjyuxgine1hlcv	4	2017	300,00 €	300,00 €	PAYE	1,491E+12	Loyer avril 2017	1,75408E+12	1,75408E+12
cmdt7u5gd011nyuxgtbdjx6eq	cmdt7u5f300yjyuxgine1hlcv	5	2017	300,00 €	300,00 €	PAYE	1,49359E+12	Loyer mai 2017	1,75408E+12	1,75408E+12
cmdt7u5ge011pyuxg1x47fojd	cmdt7u5f300yjyuxgine1hlcv	6	2017	300,00 €	300,00 €	PAYE	1,49627E+12	Loyer juin 2017	1,75408E+12	1,75408E+12
cmdt7u5ge011ryuxg5gn7894y	cmdt7u5f300yjyuxgine1hlcv	7	2017	300,00 €	300,00 €	PAYE	1,49886E+12	Loyer juillet 2017	1,75408E+12	1,75408E+12
cmdt7u5gf011tyuxgs9yv9g0w	cmdt7u5f300yjyuxgine1hlcv	8	2017	300,00 €	300,00 €	PAYE	1,50154E+12	Loyer août 2017	1,75408E+12	1,75408E+12
cmdt7u5gg011vyuxgdgb4r5xf	cmdt7u5f300yjyuxgine1hlcv	9	2017	300,00 €	300,00 €	PAYE	1,50422E+12	Loyer septembre 2017	1,75408E+12	1,75408E+12
cmdt7u5gg011xyuxgfmysqyxc	cmdt7u5f300yjyuxgine1hlcv	10	2017	300,00 €	300,00 €	PAYE	1,50681E+12	Loyer octobre 2017	1,75408E+12	1,75408E+12
cmdt7u5gh011zyuxgum4nefow	cmdt7u5f300yjyuxgine1hlcv	11	2017	300,00 €	300,00 €	PAYE	1,50949E+12	Loyer novembre 2017	1,75408E+12	1,75408E+12
cmdt7u5gi0121yuxgxexbs9lu	cmdt7u5f300yjyuxgine1hlcv	12	2017	300,00 €	300,00 €	PAYE	1,51208E+12	Loyer décembre 2017	1,75408E+12	1,75408E+12
cmdt7u5gi0123yuxg42vui864	cmdt7u5f300yjyuxgine1hlcv	1	2018	300,00 €	300,00 €	PAYE	1,51476E+12	Loyer janvier 2018	1,75408E+12	1,75408E+12
cmdt7u5gj0125yuxg8bsjrzmm	cmdt7u5f300yjyuxgine1hlcv	2	2018	300,00 €	300,00 €	PAYE	1,51744E+12	Loyer février 2018	1,75408E+12	1,75408E+12
cmdt7u5gk0127yuxgew0lfkp9	cmdt7u5f300yjyuxgine1hlcv	3	2018	300,00 €	300,00 €	PAYE	1,51986E+12	Loyer mars 2018	1,75408E+12	1,75408E+12
cmdt7u5gl0129yuxg2qcgxspv	cmdt7u5f300yjyuxgine1hlcv	4	2018	300,00 €	300,00 €	PAYE	1,52253E+12	Loyer avril 2018	1,75408E+12	1,75408E+12
cmdt7u5gm012byuxguvtjc9tl	cmdt7u5f300yjyuxgine1hlcv	5	2018	300,00 €	300,00 €	PAYE	1,52513E+12	Loyer mai 2018	1,75408E+12	1,75408E+12
cmdt7u5gm012dyuxg544ocn55	cmdt7u5f300yjyuxgine1hlcv	6	2018	300,00 €	300,00 €	PAYE	1,5278E+12	Loyer juin 2018	1,75408E+12	1,75408E+12
cmdt7u5gn012fyuxgwfp7m2v2	cmdt7u5f300yjyuxgine1hlcv	7	2018	300,00 €	300,00 €	PAYE	1,5304E+12	Loyer juillet 2018	1,75408E+12	1,75408E+12
cmdt7u5go012hyuxganguhdb3	cmdt7u5f300yjyuxgine1hlcv	8	2018	300,00 €	300,00 €	PAYE	1,53307E+12	Loyer août 2018	1,75408E+12	1,75408E+12
cmdt7u5go012jyuxg0bznzwx2	cmdt7u5f300yjyuxgine1hlcv	9	2018	300,00 €	300,00 €	PAYE	1,53575E+12	Loyer septembre 2018	1,75408E+12	1,75408E+12
cmdt7u5gp012lyuxgh5532rg1	cmdt7u5f300yjyuxgine1hlcv	10	2018	300,00 €	300,00 €	PAYE	1,53834E+12	Loyer octobre 2018	1,75408E+12	1,75408E+12
cmdt7u5gq012nyuxgpzpsoj5u	cmdt7u5f300yjyuxgine1hlcv	11	2018	300,00 €	300,00 €	PAYE	1,54103E+12	Loyer novembre 2018	1,75408E+12	1,75408E+12
cmdt7u5gq012pyuxgihcb2ec0	cmdt7u5f300yjyuxgine1hlcv	12	2018	300,00 €	300,00 €	PAYE	1,54362E+12	Loyer décembre 2018	1,75408E+12	1,75408E+12
cmdt7u5gr012ryuxgy0g2dit5	cmdt7u5f300yjyuxgine1hlcv	1	2019	300,00 €	300,00 €	PAYE	1,5463E+12	Loyer janvier 2019	1,75408E+12	1,75408E+12
cmdt7u5gs012tyuxg5d54tqco	cmdt7u5f300yjyuxgine1hlcv	2	2019	300,00 €	300,00 €	PAYE	1,54898E+12	Loyer février 2019	1,75408E+12	1,75408E+12
cmdt7u5gs012vyuxgd77ad9jd	cmdt7u5f300yjyuxgine1hlcv	3	2019	300,00 €	300,00 €	PAYE	1,55139E+12	Loyer mars 2019	1,75408E+12	1,75408E+12
cmdt7u5gt012xyuxgeelwnyd6	cmdt7u5f300yjyuxgine1hlcv	4	2019	300,00 €	300,00 €	PAYE	1,55407E+12	Loyer avril 2019	1,75408E+12	1,75408E+12
cmdt7u5gu012zyuxgl1t5tv1g	cmdt7u5f300yjyuxgine1hlcv	5	2019	300,00 €	300,00 €	PAYE	1,55666E+12	Loyer mai 2019	1,75408E+12	1,75408E+12
cmdt7u5gu0131yuxgbdbqsavy	cmdt7u5f300yjyuxgine1hlcv	6	2019	300,00 €	300,00 €	PAYE	1,55934E+12	Loyer juin 2019	1,75408E+12	1,75408E+12
cmdt7u5gv0133yuxgr6gb79dy	cmdt7u5f300yjyuxgine1hlcv	7	2019	300,00 €	300,00 €	PAYE	1,56193E+12	Loyer juillet 2019	1,75408E+12	1,75408E+12
cmdt7u5gw0135yuxgrm08i7kc	cmdt7u5f300yjyuxgine1hlcv	8	2019	300,00 €	300,00 €	PAYE	1,56461E+12	Loyer août 2019	1,75408E+12	1,75408E+12
cmdt7u5gw0137yuxgl8kp70a3	cmdt7u5f300yjyuxgine1hlcv	9	2019	300,00 €	300,00 €	PAYE	1,56729E+12	Loyer septembre 2019	1,75408E+12	1,75408E+12
cmdt7u5gx0139yuxgyx4orvmw	cmdt7u5f300yjyuxgine1hlcv	10	2019	300,00 €	300,00 €	PAYE	1,56988E+12	Loyer octobre 2019	1,75408E+12	1,75408E+12
cmdt7u5gx013byuxgpabfhdke	cmdt7u5f300yjyuxgine1hlcv	11	2019	300,00 €	300,00 €	PAYE	1,57256E+12	Loyer novembre 2019	1,75408E+12	1,75408E+12
cmdt7u5gy013dyuxgoxpvuhtn	cmdt7u5f300yjyuxgine1hlcv	12	2019	300,00 €	300,00 €	PAYE	1,57515E+12	Loyer décembre 2019	1,75408E+12	1,75408E+12
cmdt7u5gz013fyuxg8rnthxir	cmdt7u5f300yjyuxgine1hlcv	1	2020	300,00 €	300,00 €	PAYE	1,57783E+12	Loyer janvier 2020	1,75408E+12	1,75408E+12
cmdt7u5gz013hyuxgz1zm0ew9	cmdt7u5f300yjyuxgine1hlcv	2	2020	300,00 €	300,00 €	PAYE	1,58051E+12	Loyer février 2020	1,75408E+12	1,75408E+12
cmdt7u5h0013jyuxgk80djk8w	cmdt7u5f300yjyuxgine1hlcv	3	2020	300,00 €	300,00 €	PAYE	1,58302E+12	Loyer mars 2020	1,75408E+12	1,75408E+12
cmdt7u5h1013lyuxgs31pcbzq	cmdt7u5f300yjyuxgine1hlcv	4	2020	300,00 €	300,00 €	PAYE	1,58569E+12	Loyer avril 2020	1,75408E+12	1,75408E+12
cmdt7u5h1013nyuxgm7fqnat6	cmdt7u5f300yjyuxgine1hlcv	5	2020	300,00 €	300,00 €	PAYE	1,58828E+12	Loyer mai 2020	1,75408E+12	1,75408E+12
cmdt7u5h2013pyuxgzvoc1m3q	cmdt7u5f300yjyuxgine1hlcv	6	2020	300,00 €	300,00 €	PAYE	1,59096E+12	Loyer juin 2020	1,75408E+12	1,75408E+12
cmdt7u5h2013ryuxgxpo5dif7	cmdt7u5f300yjyuxgine1hlcv	7	2020	300,00 €	300,00 €	PAYE	1,59355E+12	Loyer juillet 2020	1,75408E+12	1,75408E+12
cmdt7u5h3013tyuxgms5xw00k	cmdt7u5f300yjyuxgine1hlcv	8	2020	300,00 €	300,00 €	PAYE	1,59623E+12	Loyer août 2020	1,75408E+12	1,75408E+12
cmdt7u5h4013vyuxgba447mmq	cmdt7u5f300yjyuxgine1hlcv	9	2020	300,00 €	300,00 €	PAYE	1,59891E+12	Loyer septembre 2020	1,75408E+12	1,75408E+12
cmdt7u5h4013xyuxgfq45gxzk	cmdt7u5f300yjyuxgine1hlcv	10	2020	300,00 €	300,00 €	PAYE	1,6015E+12	Loyer octobre 2020	1,75408E+12	1,75408E+12
cmdt7u5h5013zyuxg20fk3jnb	cmdt7u5f300yjyuxgine1hlcv	11	2020	300,00 €	300,00 €	PAYE	1,60419E+12	Loyer novembre 2020	1,75408E+12	1,75408E+12
cmdt7u5h60141yuxgdsqd7olo	cmdt7u5f300yjyuxgine1hlcv	12	2020	327,50 €	327,50 €	PAYE	1,60678E+12	Loyer décembre 2020	1,75408E+12	1,75408E+12
cmdt7u5h60143yuxgh7wsdjhd	cmdt7u5f300yjyuxgine1hlcv	1	2021	327,50 €	327,50 €	PAYE	1,60946E+12	Loyer janvier 2021	1,75408E+12	1,75408E+12
cmdt7u5h70145yuxg2sfhk6mn	cmdt7u5f300yjyuxgine1hlcv	2	2021	327,50 €	327,50 €	PAYE	1,61213E+12	Loyer février 2021	1,75408E+12	1,75408E+12
cmdt7u5h80147yuxgjffi152f	cmdt7u5f300yjyuxgine1hlcv	3	2021	327,50 €	327,50 €	PAYE	1,61455E+12	Loyer mars 2021	1,75408E+12	1,75408E+12
cmdt7u5h80149yuxg66jw4xmm	cmdt7u5f300yjyuxgine1hlcv	4	2021	327,50 €	327,50 €	PAYE	1,61723E+12	Loyer avril 2021	1,75408E+12	1,75408E+12
cmdt7u5h9014byuxgd4gbdq6j	cmdt7u5f300yjyuxgine1hlcv	5	2021	327,50 €	327,50 €	PAYE	1,61982E+12	Loyer mai 2021	1,75408E+12	1,75408E+12
cmdt7u5ha014dyuxglr3f0g4r	cmdt7u5f300yjyuxgine1hlcv	6	2021	327,50 €	327,50 €	PAYE	1,6225E+12	Loyer juin 2021	1,75408E+12	1,75408E+12
cmdt7u5ha014fyuxgunbcl5wv	cmdt7u5f300yjyuxgine1hlcv	7	2021	327,50 €	327,50 €	PAYE	1,62509E+12	Loyer juillet 2021	1,75408E+12	1,75408E+12
cmdt7u5hb014hyuxgf6649pwz	cmdt7u5f300yjyuxgine1hlcv	8	2021	327,50 €	327,50 €	PAYE	1,62777E+12	Loyer août 2021	1,75408E+12	1,75408E+12
cmdt7u5hc014jyuxgc5bbaqjy	cmdt7u5f300yjyuxgine1hlcv	9	2021	327,50 €	327,50 €	PAYE	1,63045E+12	Loyer septembre 2021	1,75408E+12	1,75408E+12
cmdt7u5hc014lyuxgj5bvbuif	cmdt7u5f300yjyuxgine1hlcv	10	2021	327,50 €	327,50 €	PAYE	1,63304E+12	Loyer octobre 2021	1,75408E+12	1,75408E+12
cmdt7u5hd014nyuxgd04mbbgb	cmdt7u5f300yjyuxgine1hlcv	11	2021	327,50 €	327,50 €	PAYE	1,63572E+12	Loyer novembre 2021	1,75408E+12	1,75408E+12
cmdt7u5hd014pyuxgcnqcmdpb	cmdt7u5f300yjyuxgine1hlcv	12	2021	327,50 €	327,50 €	PAYE	1,63831E+12	Loyer décembre 2021	1,75408E+12	1,75408E+12
cmdt7u5he014ryuxga1cjsx1e	cmdt7u5f300yjyuxgine1hlcv	1	2022	327,50 €	327,50 €	PAYE	1,64099E+12	Loyer janvier 2022	1,75408E+12	1,75408E+12
cmdt7u5hf014tyuxggukcbl0x	cmdt7u5f300yjyuxgine1hlcv	2	2022	327,50 €	327,50 €	PAYE	1,64367E+12	Loyer février 2022	1,75408E+12	1,75408E+12
cmdt7u5hf014vyuxg0mky3mtx	cmdt7u5f300yjyuxgine1hlcv	3	2022	327,50 €	327,50 €	PAYE	1,64609E+12	Loyer mars 2022	1,75408E+12	1,75408E+12
cmdt7u5hg014xyuxgme62bm0i	cmdt7u5f300yjyuxgine1hlcv	4	2022	327,50 €	327,50 €	PAYE	1,64876E+12	Loyer avril 2022	1,75408E+12	1,75408E+12
cmdt7u5hh014zyuxgrqmabkx1	cmdt7u5f300yjyuxgine1hlcv	5	2022	327,50 €	327,50 €	PAYE	1,65136E+12	Loyer mai 2022	1,75408E+12	1,75408E+12
cmdt7u5hh0151yuxggmwg12sd	cmdt7u5f300yjyuxgine1hlcv	6	2022	327,50 €	327,50 €	PAYE	1,65403E+12	Loyer juin 2022	1,75408E+12	1,75408E+12
cmdt7u5hi0153yuxgj9un0wnu	cmdt7u5f300yjyuxgine1hlcv	7	2022	327,50 €	327,50 €	PAYE	1,65663E+12	Loyer juillet 2022	1,75408E+12	1,75408E+12
cmdt7u5hj0155yuxgwpm0wh2x	cmdt7u5f300yjyuxgine1hlcv	8	2022	327,50 €	327,50 €	PAYE	1,6593E+12	Loyer août 2022	1,75408E+12	1,75408E+12
cmdt7u5hk0157yuxg0hrvvngx	cmdt7u5f300yjyuxgine1hlcv	9	2022	327,50 €	327,50 €	PAYE	1,66198E+12	Loyer septembre 2022	1,75408E+12	1,75408E+12
cmdt7u5hk0159yuxgwperjrt2	cmdt7u5f300yjyuxgine1hlcv	10	2022	327,50 €	327,50 €	PAYE	1,66458E+12	Loyer octobre 2022	1,75408E+12	1,75408E+12
cmdt7u5hl015byuxgi9x7u4fe	cmdt7u5f300yjyuxgine1hlcv	11	2022	327,50 €	327,50 €	PAYE	1,66726E+12	Loyer novembre 2022	1,75408E+12	1,75408E+12
cmdt7u5hm015dyuxglqfh7sjl	cmdt7u5f300yjyuxgine1hlcv	12	2022	327,50 €	327,50 €	PAYE	1,66985E+12	Loyer décembre 2022	1,75408E+12	1,75408E+12
cmdt7u5hm015fyuxgnk3tae32	cmdt7u5f300yjyuxgine1hlcv	1	2023	327,50 €	327,50 €	PAYE	1,67253E+12	Loyer janvier 2023	1,75408E+12	1,75408E+12
cmdt7u5hn015hyuxg438xu083	cmdt7u5f300yjyuxgine1hlcv	2	2023	330,00 €	330,00 €	PAYE	1,67521E+12	Loyer février 2023	1,75408E+12	1,75408E+12
cmdt7u5hn015jyuxgh92ebd87	cmdt7u5f300yjyuxgine1hlcv	3	2023	330,00 €	330,00 €	PAYE	1,67763E+12	Loyer mars 2023	1,75408E+12	1,75408E+12
cmdt7u5ho015lyuxgeqzbi7pm	cmdt7u5f300yjyuxgine1hlcv	4	2023	330,00 €	330,00 €	PAYE	1,6803E+12	Loyer avril 2023	1,75408E+12	1,75408E+12
cmdt7u5hp015nyuxg0bbgbrj1	cmdt7u5f300yjyuxgine1hlcv	5	2023	330,00 €	330,00 €	PAYE	1,68289E+12	Loyer mai 2023	1,75408E+12	1,75408E+12
cmdt7u5hp015pyuxgqdz7mpgx	cmdt7u5f300yjyuxgine1hlcv	6	2023	330,00 €	330,00 €	PAYE	1,68557E+12	Loyer juin 2023	1,75408E+12	1,75408E+12
cmdt7u5hq015ryuxg5x7hrknt	cmdt7u5f300yjyuxgine1hlcv	7	2023	330,00 €	330,00 €	PAYE	1,68816E+12	Loyer juillet 2023	1,75408E+12	1,75408E+12
cmdt7u5hr015tyuxgsktyzzo3	cmdt7u5f300yjyuxgine1hlcv	8	2023	330,00 €	330,00 €	PAYE	1,69084E+12	Loyer août 2023	1,75408E+12	1,75408E+12
cmdt7u5hr015vyuxgw8khq77f	cmdt7u5f300yjyuxgine1hlcv	9	2023	330,00 €	330,00 €	PAYE	1,69352E+12	Loyer septembre 2023	1,75408E+12	1,75408E+12
cmdt7u5hs015xyuxga8etwwns	cmdt7u5f300yjyuxgine1hlcv	10	2023	330,00 €	330,00 €	PAYE	1,69611E+12	Loyer octobre 2023	1,75408E+12	1,75408E+12
cmdt7u5hs015zyuxgw10rry1d	cmdt7u5f300yjyuxgine1hlcv	11	2023	330,00 €	330,00 €	PAYE	1,69879E+12	Loyer novembre 2023	1,75408E+12	1,75408E+12
cmdt7u5ht0161yuxg6bb7o4gx	cmdt7u5f300yjyuxgine1hlcv	12	2023	330,00 €	330,00 €	PAYE	1,70139E+12	Loyer décembre 2023	1,75408E+12	1,75408E+12
cmdt7u5hu0163yuxgeexas9c9	cmdt7u5f300yjyuxgine1hlcv	1	2024	335,00 €	335,00 €	PAYE	1,70406E+12	Loyer janvier 2024	1,75408E+12	1,75408E+12
cmdt7u5hu0165yuxg5kxc3sf9	cmdt7u5f300yjyuxgine1hlcv	2	2024	335,00 €	335,00 €	PAYE	1,70674E+12	Loyer février 2024	1,75408E+12	1,75408E+12
cmdt7u5hv0167yuxgvxu2dh8k	cmdt7u5f300yjyuxgine1hlcv	3	2024	335,00 €	335,00 €	PAYE	1,70925E+12	Loyer mars 2024	1,75408E+12	1,75408E+12
cmdt7u5hw0169yuxg2blqabst	cmdt7u5f300yjyuxgine1hlcv	4	2024	335,00 €	335,00 €	PAYE	1,71192E+12	Loyer avril 2024	1,75408E+12	1,75408E+12
cmdt7u5hw016byuxgyfjt4zjt	cmdt7u5f300yjyuxgine1hlcv	5	2024	335,00 €	335,00 €	PAYE	1,71451E+12	Loyer mai 2024	1,75408E+12	1,75408E+12
cmdt7u5hx016dyuxgt9622sdu	cmdt7u5f300yjyuxgine1hlcv	6	2024	335,00 €	335,00 €	PAYE	1,71719E+12	Loyer juin 2024	1,75408E+12	1,75408E+12
cmdt7u5hx016fyuxg38gz43kk	cmdt7u5f300yjyuxgine1hlcv	7	2024	335,00 €	335,00 €	PAYE	1,71978E+12	Loyer juillet 2024	1,75408E+12	1,75408E+12
cmdt7u5hy016hyuxgnbbqki6c	cmdt7u5f300yjyuxgine1hlcv	8	2024	335,00 €	335,00 €	PAYE	1,72246E+12	Loyer août 2024	1,75408E+12	1,75408E+12
cmdt7u5hz016jyuxgw7l9vgio	cmdt7u5f300yjyuxgine1hlcv	9	2024	335,00 €	335,00 €	PAYE	1,72514E+12	Loyer septembre 2024	1,75408E+12	1,75408E+12
cmdt7u5hz016lyuxgudijho3u	cmdt7u5f300yjyuxgine1hlcv	10	2024	335,00 €	335,00 €	PAYE	1,72773E+12	Loyer octobre 2024	1,75408E+12	1,75408E+12
cmdt7u5i0016nyuxgjy8hvz32	cmdt7u5f300yjyuxgine1hlcv	11	2024	335,00 €	335,00 €	PAYE	1,73042E+12	Loyer novembre 2024	1,75408E+12	1,75408E+12
cmdt7u5i0016pyuxg4bder9ou	cmdt7u5f300yjyuxgine1hlcv	12	2024	335,00 €	335,00 €	PAYE	1,73301E+12	Loyer décembre 2024	1,75408E+12	1,75408E+12
cmdt7u5i1016ryuxg84fl0w1b	cmdt7u5f300yjyuxgine1hlcv	1	2025	335,00 €	335,00 €	PAYE	1,73569E+12	Loyer janvier 2025	1,75408E+12	1,75408E+12
cmdt7u5i2016tyuxged9c9pkw	cmdt7u5f300yjyuxgine1hlcv	2	2025	335,00 €	335,00 €	PAYE	1,73836E+12	Loyer février 2025	1,75408E+12	1,75408E+12
cmdt7u5i2016vyuxg0guhq5sc	cmdt7u5f300yjyuxgine1hlcv	3	2025	335,00 €	335,00 €	PAYE	1,74078E+12	Loyer mars 2025	1,75408E+12	1,75408E+12
cmdt7u5i3016xyuxgstn8zghv	cmdt7u5f300yjyuxgine1hlcv	4	2025	335,00 €	335,00 €	PAYE	1,74346E+12	Loyer avril 2025	1,75408E+12	1,75408E+12
cmdt7u5i3016zyuxg3q5wl750	cmdt7u5f300yjyuxgine1hlcv	5	2025	335,00 €	335,00 €	PAYE	1,74605E+12	Loyer mai 2025	1,75408E+12	1,75408E+12
cmdt7u5i40171yuxg1imcp6tf	cmdt7u5f300yjyuxgine1hlcv	6	2025	335,00 €	335,00 €	PAYE	1,74873E+12	Loyer juin 2025	1,75408E+12	1,75408E+12
cmdt7u5i50173yuxgwh33y5lk	cmdt7u5f300yjyuxgine1hlcv	7	2025	335,00 €	335,00 €	PAYE	1,75132E+12	Loyer juillet 2025	1,75408E+12	1,75408E+12
cmdt7u5i60175yuxg1t9kikxs	cmdt7u5f300yjyuxgine1hlcv	8	2025	335,00 €	335,00 €	PAYE	1,754E+12	Loyer août 2025	1,75408E+12	1,75408E+12`;

// Fonction pour nettoyer et parser les montants
function parseAmount(amountStr) {
  if (!amountStr) return 0;
  
  // Supprimer les symboles € et espaces, remplacer virgules par points
  const cleaned = amountStr.toString()
    .replace(/€/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '.');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Fonction pour convertir les timestamps Excel en dates
function excelTimestampToDate(timestamp) {
  if (!timestamp) return new Date();
  
  // Les timestamps Excel sont en millisecondes depuis 1970
  const timestampMs = parseFloat(timestamp.toString());
  return new Date(timestampMs);
}

async function insertLoyers() {
  try {
    console.log('🚀 Début de l\'insertion des loyers...');
    
    // Diviser les données en lignes (chercher les patterns d'ID pour séparer)
    const lines = loyersData.trim().split(/(?=cmdt\w+)/g).filter(line => line.trim());
    console.log(`📊 ${lines.length} loyers à insérer`);
    
    let inserted = 0;
    let errors = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        // Diviser chaque ligne par tabulations ou espaces multiples
        const columns = line.split(/\t+|\s{2,}/).filter(col => col.trim());
        
        if (columns.length < 11) {
          console.warn(`⚠️  Ligne ${i + 1} ignorée: pas assez de colonnes (${columns.length})`);
          continue;
        }
        
        const [
          id,
          contratId,
          mois,
          annee,
          montantDu,
          montantPaye,
          statut,
          dateEcheance,
          commentaires,
          createdAt,
          updatedAt
        ] = columns;
        
        // Vérifier si le loyer existe déjà
        const existingLoyer = await prisma.loyer.findUnique({
          where: { id: id }
        });
        
        if (existingLoyer) {
          console.log(`⏭️  Loyer ${id} existe déjà, ignoré`);
          continue;
        }
        
        // Vérifier si le contrat existe
        const contratExists = await prisma.contrat.findUnique({
          where: { id: contratId }
        });
        
        if (!contratExists) {
          console.warn(`⚠️  Contrat ${contratId} non trouvé pour le loyer ${id}`);
          errors++;
          continue;
        }
        
        // Créer le loyer
        const loyerData = {
          id: id,
          contratId: contratId,
          mois: parseInt(mois),
          annee: parseInt(annee),
          montantDu: parseAmount(montantDu),
          montantPaye: parseAmount(montantPaye),
          statut: statut || 'EN_ATTENTE',
          dateEcheance: excelTimestampToDate(dateEcheance),
          commentaires: commentaires || null,
          createdAt: excelTimestampToDate(createdAt),
          updatedAt: excelTimestampToDate(updatedAt)
        };
        
        await prisma.loyer.create({
          data: loyerData
        });
        
        inserted++;
        console.log(`✅ Loyer ${id} créé: ${loyerData.mois}/${loyerData.annee} - ${loyerData.montantDu}€`);
        
      } catch (error) {
        console.error(`❌ Erreur ligne ${i + 1}:`, error.message);
        errors++;
      }
    }
    
    console.log('\\n🎉 Insertion terminée !');
    console.log(`   - ${inserted} loyers créés`);
    console.log(`   - ${errors} erreurs`);
    
  } catch (error) {
    console.error('💥 Erreur fatale:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

insertLoyers();